"""Read the lexicon inventory from the checksum-verified morphology pipeline."""
import json
import argparse
import hashlib
import subprocess
import tempfile
from pathlib import Path


def load_inventory():
    with tempfile.TemporaryDirectory(prefix='quran-lexicon-') as directory:
        subprocess.run(['node', str(Path(__file__).with_name('import.mjs')), '--output', directory],
                       check=True, capture_output=True)
        return json.loads((Path(directory) / 'lexicon-inventory.json').read_text())


def coverage(inventory, baseline, expanded):
    def associated(word, index):
        return any(index['lemmas'].get(stem['lemma'], index['roots'].get(stem['root'], []))
                   for stem in word['stems'])

    def counts(words, index):
        roots = {stem['root'] for word in words for stem in word['stems'] if stem['root']}
        lemmas = {stem['lemma'] for word in words for stem in word['stems'] if stem['lemma']}
        return {'words': len(words), 'matchedWords': sum(associated(word, index) for word in words),
                'roots': len(roots), 'mappedRoots': sum(bool(index['roots'].get(root)) for root in roots),
                'lemmas': len(lemmas), 'mappedLemmas': sum(bool(index['lemmas'].get(lemma)) for lemma in lemmas)}

    verified = [word for word in inventory['words'] if word['verified']]
    baqarah = [word for word in verified if word['chapter'] == 2]
    def outcomes(index):
        return {'sourceOnly': counts(inventory['words'], index),
                'verified': counts(verified, index), 'baqarah': counts(baqarah, index)}

    def keys(group):
        return {'mapped': [key for key in inventory[group] if expanded[group].get(key)],
                'unresolved': [{'key': key, 'reason': 'no-verified-source-association'}
                               for key in inventory[group] if not expanded[group].get(key)]}

    stems = [stem for word in inventory['words'] for stem in word['stems']]
    return {
        'version': 1, 'corpusSha256': inventory['corpusSha256'], 'referenceSha256': inventory['referenceSha256'],
        'inventory': {'words': len(inventory['words']), 'roots': len(inventory['roots']), 'lemmas': len(inventory['lemmas']),
                      'rootlessStems': sum(not stem['root'] for stem in stems),
                      'keylessStems': sum(not stem['root'] and not stem['lemma'] for stem in stems)},
        'baseline': outcomes(baseline), 'expanded': outcomes(expanded), 'roots': keys('roots'), 'lemmas': keys('lemmas'),
        'wordAudit': {word['key']: {'verified': word['verified'], 'association': 'source-associated' if associated(word, expanded)
                                   else 'unresolved' if any(stem['root'] or stem['lemma'] for stem in word['stems']) else 'no-key'}
                      for word in inventory['words']},
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Compare source-associated dictionary coverage; this is not live production verification.')
    parser.add_argument('--lane', type=Path, required=True)
    parser.add_argument('--mufradat', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    lane, mufradat = [json.loads(path.read_text()) for path in (args.lane, args.mufradat)]
    if any(lane[key] != mufradat[key] for key in ('corpusSha256', 'referenceSha256', 'inventory')) or lane['wordAudit'].keys() != mufradat['wordAudit'].keys():
        raise ValueError('Dictionary reports must use the same occurrence inventory')
    words = {key: dict(verified=value['verified'], lane=value['association'], mufradat=mufradat['wordAudit'][key]['association'])
             for key, value in lane['wordAudit'].items()}
    if any(value['verified'] != mufradat['wordAudit'][key]['verified'] for key, value in words.items()):
        raise ValueError('Dictionary occurrence verification differs')

    def overlap(records):
        both = sum(word['lane'] == 'source-associated' and word['mufradat'] == 'source-associated' for word in records)
        lane_only = sum(word['lane'] == 'source-associated' and word['mufradat'] != 'source-associated' for word in records)
        mufradat_only = sum(word['lane'] != 'source-associated' and word['mufradat'] == 'source-associated' for word in records)
        return dict(words=len(records), both=both, laneOnly=lane_only, mufradatOnly=mufradat_only,
                    neither=len(records) - both - lane_only - mufradat_only)

    report = dict(version=1, corpusSha256=lane['corpusSha256'], referenceSha256=lane['referenceSha256'],
                  reports=dict(laneSha256=hashlib.sha256(args.lane.read_bytes()).hexdigest(),
                               mufradatSha256=hashlib.sha256(args.mufradat.read_bytes()).hexdigest()),
                  source=overlap(list(words.values())), verified=overlap([word for word in words.values() if word['verified']]),
                  baqarah=overlap([word for key, word in words.items() if word['verified'] and key.startswith('2:')]), words=words)
    args.output.write_text(json.dumps(report, ensure_ascii=False, sort_keys=True) + '\n')
