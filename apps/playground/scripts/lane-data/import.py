"""Import the pinned Alpheios/Perseus Lane XML into inert reading data."""
import argparse
import json
import hashlib
import tarfile
import gzip
import sys
from itertools import groupby
from pathlib import Path
from xml.etree import ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'quran-data'))
from lexicon import load_inventory, coverage

APP = Path(__file__).resolve().parents[2]
COMMIT = '7dd04e1182c13a4b0883978867d2a3b04616542a'
ADAPTATION = '\nAdaptation: XML converted to structured text with Arabic, emphasis, forms and sense boundaries; selected entries mapped to Quranic Arabic Corpus roots/lemmas. Adapted data: CC BY-SA 3.0 US.\n'


def runs(element, lang=None, emphasis=False):
    language = element.get('lang', lang)
    italic = emphasis or element.get('rend') == 'ital'
    if element.tag == 'pb':
        return [{'text': ' [Source page ' + element.get('n', '') + '] ', 'lang': None, 'emphasis': False}]
    first = [{'text': element.text, 'lang': language, 'emphasis': italic}] if element.text else []
    children = [item for child in element for item in (
        runs(child, language, italic)
        + ([{'text': child.tail, 'lang': language, 'emphasis': italic}] if child.tail else [])
    )]
    return first + children


def blocks(entry):
    first = [{'kind': 'text', 'label': '', 'runs': [{'text': entry.text, 'lang': None, 'emphasis': False}]}] if entry.text else []
    return first + [block for child in entry for block in (
        [{'kind': 'sense' if child.tag == 'milestone' else 'form' if child.tag == 'form' else 'text',
          'label': child.get('n', '') if child.tag == 'milestone' else '', 'runs': runs(child)}]
        + ([{'kind': 'text', 'label': '', 'runs': [{'text': child.tail, 'lang': None, 'emphasis': False}]}] if child.tail else [])
    )]


def candidate_roots(raw, ids):
    # The pinned XML uses double-quoted IDs. This only skips negative files;
    # parsed entry IDs and source root groups still decide every positive match.
    if not any(('id="' + entry + '"').encode('utf-8') in raw for entry in ids):
        return []
    return ET.fromstring(raw).findall('.//div2')


def generate(output, source, mappings_file, notices_only=False, expanded=False):
    if hashlib.sha256(source.read_bytes()).hexdigest() != '633b60ec3dbccb8c5214dcb0dcdfb5979f26610789093dc18c32780ce2bb6b05':
        raise ValueError('Source checksum mismatch')
    mappings = json.loads(mappings_file.read_text(encoding='utf-8'))
    ids = {entry for group in ('roots', 'lemmas') for entries in mappings[group].values() for entry in entries}
    with tarfile.open(source) as archive:
        notice = archive.extractfile('lan-' + COMMIT + '/README.md').read().decode()
        if notices_only:
            output.mkdir(parents=True, exist_ok=True)
            if any(path.name != 'NOTICE.txt' for path in output.iterdir()):
                raise ValueError('Move dictionary assets out of the browser notices directory')
            (output / 'NOTICE.txt').write_text(notice + ADAPTATION, encoding='utf-8')
            return
        source_index = archive.extractfile('lan-' + COMMIT + '/db/indexes/ara-lan-index.xml').read()
        indexed_ids = {entry.get('id') for entry in ET.fromstring(source_index)}
        indexed_headwords = {(entry.get('id'), entry.get('lemma')) for entry in ET.fromstring(source_index)}
        if not ids.issubset(indexed_ids):
            raise ValueError('Mapping entry is absent from the pinned source index')
        inventory = load_inventory() if expanded else {'roots': []}
        roots = set(inventory['roots'])
        lemmas = set(inventory.get('lemmas', []))
        files = sorted(name for name in archive.getnames() if '/db/lexica/ara/lan/' in name and name.endswith('.xml'))
        available = [
            {'id': entry.get('id'), 'headword': entry.get('key'),
             'root': root,
             'file': Path(name).name,
             'sourceUrl': 'https://github.com/alpheios-project/lan/blob/' + COMMIT + '/db/lexica/ara/lan/' + Path(name).name,
             'blocks': blocks(entry)}
            for name in files
            for group in (ET.fromstring(archive.extractfile(name).read()).findall('.//div2') if expanded else candidate_roots(archive.extractfile(name).read(), ids))
            for root in [''.join(group.find('head').itertext()).strip() if group.find('head') is not None else '']
            for entry in group.findall('entryFree') if entry.get('id') and entry.get('key') and (entry.get('id') in ids or root in roots or entry.get('key') in lemmas)
            and (not expanded or (entry.get('id'), entry.get('key')) in indexed_headwords)
        ]
        entries = [entry for entry in available if entry['id'] in ids]
    by_id = {entry['id']: entry for entry in entries}
    if ids != set(by_id):
        raise ValueError('Mapping entry is absent from the pinned lexicon XML')
    if any(by_id[entry]['root'] != root for root, entries in mappings['roots'].items() for entry in entries):
        raise ValueError('Mapping root does not match source root')
    (output / 'lane').mkdir(parents=True, exist_ok=True)
    [path.unlink() for path in (output / 'lane').glob('n*.json') if path.stem not in ids]
    [(output / 'lane' / (entry['id'] + '.json')).write_text(json.dumps(entry, ensure_ascii=False) + '\n') for entry in entries]
    if expanded:
        complete = {entry['id']: entry for entry in available if entry['root'] in roots or entry['headword'] in lemmas} | by_id
        catalogue = {
            'roots': {root: sorted({entry['id'] for entry in entries}, key=lambda value: int(value[1:]))
                      for root, entries in groupby(sorted(complete.values(), key=lambda entry: entry['root']), key=lambda entry: entry['root']) if root in roots},
            'lemmas': {lemma: sorted({entry['id'] for entry in entries}, key=lambda value: int(value[1:]))
                       for lemma, entries in groupby(sorted(complete.values(), key=lambda entry: entry['headword']), key=lambda entry: entry['headword']) if lemma in lemmas} | mappings['lemmas'],
        }
        ordered = sorted(complete.values(), key=lambda entry: int(entry['id'][1:]))
        packs = {'packs/' + ordered[offset]['id'] + '.json.gz': {entry['id']: entry for entry in ordered[offset:offset + 32]}
                 for offset in range(0, len(ordered), 32)}
        (output / 'packs').mkdir(exist_ok=True)
        [path.unlink() for path in (output / 'packs').glob('*.json.gz') if str(path.relative_to(output)) not in packs]
        [path.unlink() for path in (output / 'lane').glob('*.json.gz')]
        [(output / path).write_bytes(gzip.compress(
            (json.dumps(entries, ensure_ascii=False, sort_keys=True) + '\n').encode(), compresslevel=6, mtime=0)) for path, entries in packs.items()]
        catalogue['entryFiles'] = {entry_id: path for path, entries in packs.items() for entry_id in entries}
        (output / 'catalogue.json').write_text(json.dumps(catalogue, ensure_ascii=False, sort_keys=True) + '\n')
        (output / 'coverage.json').write_text(json.dumps(coverage(inventory, mappings, catalogue), ensure_ascii=False, sort_keys=True) + '\n')
    (output / 'index.json').write_text(json.dumps(mappings, ensure_ascii=False) + '\n')
    (output / 'NOTICE.txt').write_text(notice + ADAPTATION, encoding='utf-8')
    manifest = {
        'commit': COMMIT,
        'source': 'https://github.com/alpheios-project/lan',
        'archiveSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'licence': 'CC BY-SA 3.0 US',
        'files': {str(path.relative_to(output)): hashlib.sha256(path.read_bytes()).hexdigest()
                  for path in sorted(output.rglob('*')) if path.is_file() and path.name != 'manifest.json'},
    }
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    parser.add_argument('--source', type=Path, default=APP / 'data/lane/source/lane-7dd04e1.tar.gz')
    parser.add_argument('--mappings', type=Path, default=APP / 'data/lane/mappings.json')
    parser.add_argument('--notices-only', action='store_true')
    parser.add_argument('--expanded', action='store_true')
    args = parser.parse_args()
    default_output = APP / 'public/quran-lexicons' if args.notices_only else APP.parents[1] / 'supabase/functions/quran/lane-data'
    generate(args.output or default_output, args.source, args.mappings, args.notices_only, args.expanded)
