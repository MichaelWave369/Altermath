/**
 * A source-aware transcription of ONE Valentinian scheme, as described by
 * Irenaeus, Against Heresies I.1. This is not a universal Gnostic map.
 * https://www.newadvent.org/fathers/0103101.htm
 */
export const SOURCE = Object.freeze({
  author: 'Irenaeus of Lyons',
  title: 'Against Heresies, Book I, Chapter 1',
  url: 'https://www.newadvent.org/fathers/0103101.htm',
  caution: 'Polemical report of one Valentinian account; not a neutral transcript of all Gnostic traditions.'
});

const definitions = [
  ['Ogdoad', 'Bythus', 'Sige', null],
  ['Ogdoad', 'Nous', 'Aletheia', 0],
  ['Ogdoad', 'Logos', 'Zoe', 1],
  ['Ogdoad', 'Anthropos', 'Ecclesia', 2],
  ['Decad', 'Bythius', 'Mixis', 2],
  ['Decad', 'Ageratos', 'Henosis', 2],
  ['Decad', 'Autophyes', 'Hedone', 2],
  ['Decad', 'Acinetos', 'Syncrasis', 2],
  ['Decad', 'Monogenes', 'Macaria', 2],
  ['Duodecad', 'Paracletus', 'Pistis', 3],
  ['Duodecad', 'Patricos', 'Elpis', 3],
  ['Duodecad', 'Metricos', 'Agape', 3],
  ['Duodecad', 'Ainos', 'Synesis', 3],
  ['Duodecad', 'Ecclesiasticus', 'Macariotes', 3],
  ['Duodecad', 'Theletos', 'Sophia', 3]
];
const slug = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
export const PAIRS = Object.freeze(definitions.map(([group, a, b, parentIndex], index) =>
  Object.freeze({
    id: `pair-${String(index + 1).padStart(2, '0')}`,
    group,
    names: Object.freeze([a, b]),
    // Unambiguous even where a name doubles as an epithet in the sources.
    members: Object.freeze([slug(a), slug(b)]),
    parentId: parentIndex === null ? null : `pair-${String(parentIndex + 1).padStart(2, '0')}`
  })
));
export const AEONS = Object.freeze(PAIRS.flatMap(pair => pair.members.map((id, side) =>
  Object.freeze({ id, label: pair.names[side], pairId: pair.id, group: pair.group, side })
)));
export const LINEAGES = Object.freeze(PAIRS.filter(p => p.parentId !== null).map(p =>
  Object.freeze({ fromPair: p.parentId, toPair: p.id })
));
export const GROUPS = Object.freeze([
  Object.freeze({ name: 'Ogdoad', count: 8, pairs: 4 }),
  Object.freeze({ name: 'Decad', count: 10, pairs: 5 }),
  Object.freeze({ name: 'Duodecad', count: 12, pairs: 6 })
]);
