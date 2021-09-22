function formatNumber(x: number, n: number) {
  const re = "\\d(?=(\\d{" + (x || 3) + "})+" + (n > 0 ? "\\." : "$") + ")";
  return x.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, "g"), "$&,");
}

// [start slot, length of slot], e.g. [6, 3]
type RawTimeslot = [number, number];

// list of timeslots, room
// e.g. [[[6, 3], [66, 3]], "34-101"
type RawSection = [Array<RawTimeslot>, string];

// following combiner_ws.py
type RawClass = {
  // no: "6.036", co: "6", cl: "036"
  no: string;
  co: string;
  cl: string;
  tb: boolean; // tba

  s: Array<string>; // subset of ["l", "r", "b"]
  l: Array<RawSection>; // lecture
  r: Array<RawSection>; // recitation
  b: Array<RawSection>; // lab
  // raw strings, e.g. T9.30-11 or TR1,F2
  lr: string;
  rr: string;
  br: string;

  // hass-h, hass-a, hass-s, hass-e
  hh: boolean;
  ha: boolean;
  hs: boolean;
  he: boolean;
  // ci-h, ci-hw
  ci: boolean;
  cw: boolean;
  // rest, lab, partial institute lab
  re: boolean;
  la: boolean;
  pl: boolean;

  // units of lecture, recitation, lab e.g. 5-0-7
  u1: number;
  u2: number;
  u3: number;

  // level: undergrad or grad
  le: "U" | "G";
  // comma-separated list of same classes
  // e.g. "21A.103, WGS.225"
  sa: string;
  // comma-separated list of meets with classes
  mw: string;

  // subset of ["FA", "JA", "SP", "SU"]
  t: Array<string>;
  // string describing prereqs
  // generally could be anything
  pr: string;

  d: string; // description
  n: string; // name
  i: string; // in-charge

  v: boolean; // virtual

  nx: boolean; // true if NOT offered next year
  rp: boolean; // can be repeated for credit
  u: string; // class url
  f: boolean; // has final

  ra: number; // rating from evals
  h: number; // hours from evals
  si: number; // size from evals
};

enum SectionKind {
  LECTURE = "l",
  RECITATION = "r",
  LAB = "b",
}

class Timeslot {
  startSlot: number;
  numSlots: number;

  constructor(timeslot: RawTimeslot) {
    [this.startSlot, this.numSlots] = timeslot;
  }
}

class Section {
  cls: Class;
  kind: SectionKind;
  timeslots: Array<Timeslot>;
  room: string;

  constructor(cls: Class, kind: SectionKind, section: RawSection) {
    this.cls = cls;
    this.kind = kind;
    const [rawSlots, room] = section;
    this.timeslots = rawSlots.map((slot) => new Timeslot(slot));
    this.room = room;
  }
}

// rawClass wraper
class Class {
  rawClass: RawClass;

  constructor(rawClass: RawClass) {
    this.rawClass = rawClass;
  }

  get number(): string {
    return this.rawClass.n;
  }

  get units(): number {
    return this.rawClass.u1 + this.rawClass.u2 + this.rawClass.u3;
  }

  get hours(): { hours: number; setToUnits: boolean } {
    const setToUnits = !this.rawClass.h;
    return {
      hours: setToUnits ? this.units : this.rawClass.h,
      setToUnits,
    };
  }

  get sectionKinds(): Array<SectionKind> {
    const map = {
      l: SectionKind.LECTURE,
      r: SectionKind.RECITATION,
      b: SectionKind.LAB,
    };
    return this.rawClass.s.map((kind) => map[kind]);
  }

  sectionsOfKind(kind: SectionKind): Array<Section> {
    return this.rawClass[kind].map((sec) => new Section(this, kind, sec));
  }

  get sections(): Map<SectionKind, Array<Section>> {
    return new Map(this.sectionKinds.map((kind) => [kind, this.sectionsOfKind(kind)]));
  }
}

// "6.036", "5.5", "10.2", "Introduction to Machine Learning"
type EvalTableRow = [string, string, string, string];

class Firehose {
  rawClasses: Map<string, RawClass>;
  evalTableRows: Array<EvalTableRow>;
  currentClasses: Array<Class> = [];

  constructor(rawClasses: Map<string, RawClass>) {
    this.rawClasses = rawClasses;
    this.evalTableRows = [];
    for (const cls of this.rawClasses.values()) {
      this.evalTableRows.push([cls.no, formatNumber(cls.ra, 1), formatNumber(cls.h, 1), cls.n]);
    }
  }

  fillTable(isSelected: (cls: string) => boolean): Array<EvalTableRow> {
    return this.evalTableRows.filter(([cls]) => isSelected(cls));
  }

  selectSlots(
    lockedSlots: Map<string, number>
  ): {
    // [class number, section kind]
    allSections: Array<[number, string]>;
    // each entry is e.g. [0, 0, 1], for options 0, 0, 1 of allSections
    options: Array<Array<number>>;
  } {
    return {
      allSections: [],
      options: [],
    };
  }
}
