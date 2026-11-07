"""Import inspected entry ranges from the pinned, cleaned OpenITI text."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'quran-data'))
from lexicon import load_inventory, coverage

APP = Path(__file__).resolve().parents[2]
SOURCE_ID = '0502RaghibIsbahani.Mufradat.JK001150-ara1'
COMMIT = '6290621b58e063ed1aa47ffd0a6fc1630191e7cb'
SOURCE_SHA256 = '925bfcafa3cfe5ec467f7ac8c2b13228f8c34fc725b792c2d27e077fc17a88f9'
SOURCE_URL = f'https://github.com/OpenITI/0525AH/blob/{COMMIT}/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/{SOURCE_ID}'
NOTICE = f'Al-Raghib al-Isbahani, المفردات في غريب القرآن. OpenITI: {SOURCE_ID}\n{SOURCE_URL}\nCommit: {COMMIT}\nCC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/\nAdaptation: inspected Arabic entry ranges and explicit Quran morphology mappings.\nNo English translation. Non-commercial use; attribute and share adaptations under the same licence.\n'


def boundary(line, headword, opening=None):
    if opening:
        return opening.startswith(f'# {headword} ') and line.rstrip('\r\n') == opening
    return line.startswith(f'# {headword} :')


def extract(lines, reviewed):
    start, end = reviewed['start'], reviewed['end']
    if not (1 <= start <= end <= len(lines)):
        raise ValueError('Entry boundary mismatch')
    next_boundary = end == len(lines) if reviewed['next'] is None else end < len(lines) and boundary(lines[end], reviewed['next'], reviewed.get('nextOpening'))
    if not boundary(lines[start - 1], reviewed['headword'], reviewed.get('opening')) or not next_boundary:
        raise ValueError('Entry boundary mismatch')
    raw = ''.join(lines[start - 1:end])
    inherited_page = re.findall(r'PageV\d+P\d+', ''.join(lines[:start - 1]))[-1:]
    pages = list(dict.fromkeys(inherited_page + re.findall(r'PageV\d+P\d+', raw)))
    unwrapped = re.sub(r'\n~~', ' ', raw)
    paragraphs = re.split(r'^# ', unwrapped, flags=re.M)
    clean = [re.sub(r'@QB@|@QE@|ms\d+|PageV\d+P\d+|\||%', '', p) for p in paragraphs if p.strip()]
    return dict(id=f'jk-l{start}', headword=reviewed['headword'], startLine=start, endLine=end,
                pages=pages, raw=raw, paragraphs=[' '.join(p.split()) for p in clean],
                sourceUrl=f'{SOURCE_URL}#L{start}-L{end}')


def generate(output, source, mapping_file, expanded=False):
    data = source.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCE_SHA256:
        raise ValueError('Source checksum mismatch')
    text = data.decode('utf8')
    lines = text.splitlines(keepends=True)
    mappings = json.loads(mapping_file.read_text())
    baseline = mappings
    if expanded:
        addition = json.loads((APP / 'data/mufradat/expanded-mappings.json').read_text())
        mappings = dict(entries=mappings['entries'] + addition['entries'],
                        roots=addition['roots'] | mappings['roots'], lemmas=addition['lemmas'] | mappings['lemmas'])
    reviewed = sorted(mappings['entries'], key=lambda entry: entry['start'])
    if any(first['end'] >= second['start'] for first, second in zip(reviewed, reviewed[1:])):
        raise ValueError('Overlapping entry ranges')
    entries = [extract(lines, entry) for entry in reviewed]
    ids = {entry['id'] for entry in entries}
    references = [entry_id for group in ('roots', 'lemmas') for matches in mappings[group].values() for entry_id in matches]
    if any(entry_id not in ids for entry_id in references):
        raise ValueError('Mapping references an absent entry')
    (output / 'entries').mkdir(parents=True, exist_ok=True)
    [path.unlink() for path in (output / 'entries').glob('jk-l*.json') if path.stem not in ids]
    payloads = {f"entries/{entry['id']}.json": entry for entry in entries}
    payloads['index.json'] = dict(roots=mappings['roots'], lemmas=mappings['lemmas'])
    encoded = {name: (json.dumps(value, ensure_ascii=False, sort_keys=True) + '\n').encode() for name, value in payloads.items()}
    encoded['NOTICE.txt'] = NOTICE.encode()
    if expanded:
        encoded['coverage.json'] = (json.dumps(coverage(load_inventory(), baseline, mappings), ensure_ascii=False, sort_keys=True) + '\n').encode()
    [(output / name).write_bytes(value) for name, value in encoded.items()]
    manifest = dict(sourceId=SOURCE_ID, commit=COMMIT, sourceSha256=hashlib.sha256(text.encode()).hexdigest(),
                    licence='CC BY-NC-SA 4.0', files={name: hashlib.sha256(value).hexdigest() for name, value in encoded.items()})
    (output / 'manifest.json').write_text(json.dumps(manifest, sort_keys=True) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--notices-only', action='store_true')
    parser.add_argument('--expanded', action='store_true')
    parser.add_argument('--source', type=Path, default=APP / 'data/mufradat/source' / SOURCE_ID)
    parser.add_argument('--mappings', type=Path, default=APP / 'data/mufradat/mappings.json')
    args = parser.parse_args()
    default_output = APP / 'public/quran-mufradat' if args.notices_only else APP.parents[1] / 'supabase/functions/quran/mufradat-data'
    output = args.output or default_output
    if args.notices_only:
        if output.exists() and any(path.name != 'NOTICE.txt' for path in output.iterdir()):
            raise ValueError('Move reference assets out of the browser notices directory')
        output.mkdir(parents=True, exist_ok=True)
        (output / 'NOTICE.txt').write_text(NOTICE)
    else:
        generate(output, args.source, args.mappings, args.expanded)
