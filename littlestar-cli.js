#!/usr/bin/env node
'use strict';

/**
 * 🌟 Littlestar CLI Interpreter v2.0 (Ultimate Full Version)
 * Complete terminal port of the Littlestar web engine.
 * Author: Godspower Kenneth U.
 */

const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');

// ═══════════════════════════════════════════════════════════════
//  ERRORS & SIGNALS
// ═══════════════════════════════════════════════════════════════
class LittlestarError extends Error {
  constructor(msg, hint = '') { super(msg); this.hint = hint; this.name = 'LittlestarError'; }
}
class BreakSignal extends Error { constructor() { super('break'); } }
class ContinueSignal extends Error { constructor() { super('continue'); } }
class ReturnSignal extends Error { constructor(v) { super('return'); this.value = v; } }

function rewriteContains(expr) {
  const parts = expr.split(/\s+contains\s+/);
  if (parts.length < 2) return expr;
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const prevMatch = result.match(/(\w+)\s*$/);
    if (!prevMatch) { result += ' contains ' + parts[i]; continue; }
    const varName = prevMatch[1];
    result = result.substring(0, result.length - varName.length);
    const valMatch = parts[i].match(/^(.+?)(\s+(?:and|or|&&|\|\|)\s+.*)?$/);
    const value = valMatch ? valMatch[1].trim() : parts[i].trim();
    const rest = valMatch && valMatch[2] ? valMatch[2] : '';
    result += `__ct(${varName},${value})${rest}`;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
//  DICTIONARIES & CONSTANTS
// ═══════════════════════════════════════════════════════════════
const CURRENCY = {
  USD: 1, EUR: 0.88, GBP: 0.75, JPY: 149, CHF: 0.88, CNY: 7.2, CAD: 1.41, MXN: 17.0,
  BSD: 1, PAB: 1, BMD: 1, KYD: 0.83, BBD: 2, BZD: 2, XCD: 2.70, TTD: 6.79, JMD: 156.2,
  HTG: 132.3, DOP: 59.25, CUP: 24, CUC: 1, AWG: 1.79, ANG: 1.79, GTQ: 7.75, HNL: 24.64,
  NIO: 36.82, SVC: 8.75, CRC: 512.5, BRL: 5.02, ARS: 962, CLP: 921, COP: 3954, PEN: 3.75,
  BOB: 6.91, PYG: 7535, UYU: 39.42, VES: 36.40, GYD: 209.2, SRD: 36.25, SEK: 10.52,
  NOK: 10.64, DKK: 6.91, ISK: 138.2, PLN: 4.02, CZK: 22.84, HUF: 358.5, RON: 4.38,
  BGN: 1.72, ALL: 93.15, MKD: 56.42, RSD: 108.2, BAM: 1.72, UAH: 40.55, MDL: 17.70,
  BYN: 3.28, RUB: 92.20, TRY: 32.05, GIP: 0.75, FKP: 0.75, SHP: 0.75, GEL: 2.72,
  AMD: 388.5, AZN: 1.70, KZT: 448.4, KGS: 89.20, TJS: 10.95, TMT: 3.50, UZS: 12640,
  AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31, BHD: 0.38, OMR: 0.38, JOD: 0.71,
  ILS: 3.70, YER: 250, LBP: 89500, SYP: 2512, IQD: 1310, IRR: 42000, AFN: 70.80,
  INR: 83, PKR: 278.5, BDT: 117.5, LKR: 302.2, NPR: 133.2, MVR: 15.42, BTN: 83,
  KRW: 1340, KPW: 900, HKD: 7.83, MOP: 8.03, TWD: 32.30, MNT: 3452, SGD: 1.34,
  MYR: 4.70, THB: 35, IDR: 15500, PHP: 56, VND: 24500, KHR: 4112, LAK: 21850,
  MMK: 2100, BND: 1.34, EGP: 47.50, MAD: 10.10, TND: 3.12, LYD: 4.85, DZD: 134.5,
  SDG: 601, SSP: 130, NGN: 1550, GHS: 15.50, XOF: 578, XAF: 578, GMD: 67.80, GNF: 8600,
  LRD: 194.3, SLL: 22400, SLE: 22.40, CVE: 102.2, STN: 22.50, MRU: 39.60, KES: 130,
  ETB: 57.30, UGX: 3720, TZS: 2610, RWF: 1310, BIF: 2870, DJF: 177.7, ERN: 15,
  SOS: 571, KMF: 452, SCR: 13.40, MUR: 45.20, MGA: 4520, ZAR: 18.50, NAD: 18.50,
  SZL: 18.50, LSL: 18.50, BWP: 13.60, ZMW: 25.40, MWK: 1730, MZN: 63.80, AOA: 843,
  CDF: 2810, AUD: 1.44, NZD: 1.65, FJD: 2.22, PGK: 3.92, SBD: 8.52, TOP: 2.36,
  VUV: 118.4, WST: 2.75, XPF: 105.5
};

const UNITS = {
  length: { meter: 1, cm: 0.01, mm: 0.001, inch: 0.0254, ft: 0.3048, yard: 0.9144, mile: 1609.344, pc: 3.086e16, au: 149597870700 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.453592, oz: 0.0283495, ton: 1000 },
  time: { s: 1, ms: 0.001, min: 60, hour: 3600, day: 86400, week: 604800, year: 31557600, decade: 315576000, century: 3155760000, millennium: 31557600000 },
  data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624 },
  volume: { L: 1, mL: 0.001, gallon: 3.78541, quart: 0.946353, pint: 0.473176, cup: 0.24 },
  speed: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, fps: 0.3048 },
  angle: { deg: 1, rad: 57.2957795 }
};

// ═══════════════════════════════════════════════════════════════
//  MAIN INTERPRETER
// ═══════════════════════════════════════════════════════════════
class Littlestar {
  constructor() {
    this.vars = {}; this.fixed = new Set(); this.funcs = {}; this.dbs = {};
    this.creatorMode = false; this.debugMode = false;
    this.currentLine = 0; this.sourceLines = []; this.startTime = 0;
    this.currencyRates = null; this.currencyLastFetch = 0;
  }


    reset() {
    this.vars = {}; 
    this.fixed = new Set(); 
    this.funcs = {}; 
    this.dbs = {};
    this.creatorMode = false; 
    this.debugMode = false;
    this.currentLine = 0; 
    this.sourceLines = []; 
    this.startTime = 0;
  }
  async fetchCurrencyRates() {
    const now = Date.now();
    if (this.currencyRates && (now - this.currencyLastFetch) < 3600000) return this.currencyRates;
    try {
      if (typeof fetch === 'function') {
        const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        if (res.ok) {
          const data = await res.json();
          if (data && data.usd) {
            this.currencyRates = {};
            for (const [code, rate] of Object.entries(data.usd)) this.currencyRates[code.toUpperCase()] = rate;
            this.currencyRates['USD'] = 1;
            this.currencyLastFetch = now;
            this.debug('Currency rates updated from live API');
            return this.currencyRates;
          }
        }
      }
    } catch (e) { this.debug('Currency API failed, using fallback rates'); }
    return null;
  }

  debug(msg) { if (this.debugMode) console.log(`🐛 [line ${this.currentLine}] ${msg}`); }
  lineTag() { return this.currentLine > 0 ? ` (line ${this.currentLine})` : ''; }

  stripInlineComment(line) {
    let inStr = false, strCh = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if ((c === '"' || c === "'") && !inStr) { inStr = true; strCh = c; }
      else if (c === strCh && inStr) { inStr = false; }
      else if (c === '#' && !inStr) return line.substring(0, i).trimEnd();
    }
    return line;
  }

  splitArgs(text) {
    const out = []; let cur = '', inStr = false, strCh = '';
    let paren = 0, bracket = 0, brace = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        cur += c;
        if (c === '\\' && i + 1 < text.length) { cur += text[++i]; continue; }
        if (c === strCh) { inStr = false; strCh = ''; }
        continue;
      }
      if (c === '"' || c === "'") { inStr = true; strCh = c; cur += c; continue; }
      if (c === '(') paren++; else if (c === ')') paren--;
      else if (c === '[') bracket++; else if (c === ']') bracket--;
      else if (c === '{') brace++; else if (c === '}') brace--;
      if (c === ',' && paren === 0 && bracket === 0 && brace === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  format(val) {
    if (val === null || val === undefined) return String(val);
    if (typeof val === 'string') return val;
    if (typeof val === 'boolean') return val ? 'yes' : 'no';
    if (typeof val === 'number') return String(val);
    if (val && typeof val === 'object' && val.__isImage)
      return '__IMG__' + val.src + '|' + (val.width || '') + '|' + (val.height || '') + '__IMG__';
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      if (typeof val[0] === 'object' && val[0] !== null)
        return '\n' + val.map((it, i) => {
          const p = Object.entries(it).map(([k, v]) => `    ${k}: ${v}`).join('\n');
          return `  📄 Record ${i + 1}:\n${p}`;
        }).join('\n\n');
      return val.map(v => String(v)).join(', ');
    }
    if (typeof val === 'object') {
      const p = Object.entries(val).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      return `{\n${p}\n}`;
    }
    return String(val);
  }

  computeShape(fnType, args) {
    const PI = Math.PI;
    if (args.length < 1) throw new LittlestarError(`🌟 ${fnType}() needs a shape name.`);
    const shape = String(args[0]).toLowerCase().replace(/['"]/g, '');
    const nums = args.slice(1).map(Number);
    const shapes = {
      area: {
        circle: n => PI * (n[0] ?? 0) ** 2, square: n => (n[0] ?? 0) ** 2,
        rectangle: n => (n[0] ?? 0) * (n[1] ?? 0), triangle: n => 0.5 * (n[0] ?? 0) * (n[1] ?? 0),
        trapezoid: n => 0.5 * ((n[0] ?? 0) + (n[1] ?? 0)) * (n[2] ?? 0),
        parallelogram: n => (n[0] ?? 0) * (n[1] ?? 0), rhombus: n => 0.5 * (n[0] ?? 0) * (n[1] ?? 0),
        ellipse: n => PI * (n[0] ?? 0) * (n[1] ?? 0),
        pentagon: n => (1 / 4) * Math.sqrt(5 * (5 + 2 * Math.sqrt(5))) * (n[0] ?? 0) ** 2,
        hexagon: n => (3 * Math.sqrt(3) / 2) * (n[0] ?? 0) ** 2,
      },
      perimeter: {
        circle: n => 2 * PI * (n[0] ?? 0), square: n => 4 * (n[0] ?? 0),
        rectangle: n => 2 * ((n[0] ?? 0) + (n[1] ?? 0)),
        triangle: n => (n[0] ?? 0) + (n[1] ?? 0) + (n[2] ?? 0),
        trapezoid: n => (n[0] ?? 0) + (n[1] ?? 0) + (n[2] ?? 0) + (n[3] ?? 0),
        parallelogram: n => 2 * ((n[0] ?? 0) + (n[1] ?? 0)),
        rhombus: n => 4 * (n[0] ?? 0), pentagon: n => 5 * (n[0] ?? 0), hexagon: n => 6 * (n[0] ?? 0),
      },
      volume: {
        cube: n => (n[0] ?? 0) ** 3, sphere: n => (4 / 3) * PI * (n[0] ?? 0) ** 3,
        cylinder: n => PI * (n[0] ?? 0) ** 2 * (n[1] ?? 0), cone: n => (1 / 3) * PI * (n[0] ?? 0) ** 2 * (n[1] ?? 0),
        pyramid: n => (1 / 3) * (n[0] ?? 0) * (n[1] ?? 0) * (n[2] ?? 0),
        cuboid: n => (n[0] ?? 0) * (n[1] ?? 0) * (n[2] ?? 0), prism: n => (n[0] ?? 0) * (n[1] ?? 0),
        hemisphere: n => (2 / 3) * PI * (n[0] ?? 0) ** 3,
        ellipsoid: n => (4 / 3) * PI * (n[0] ?? 0) * (n[1] ?? 0) * (n[2] ?? 0),
      },
    };
    const fn = shapes[fnType]?.[shape];
    if (!fn) throw new LittlestarError(`🌟 Unknown shape '${shape}' for ${fnType}()${this.lineTag()}.`);
    return fn(nums);
  }

  stripComments(code) {
    let result = '', i = 0, inString = false, stringChar = '';
    while (i < code.length) {
      const c = code[i], next = code[i + 1], next2 = code[i + 2];
      if (c === '"' && next === '"' && next2 === '"' && !inString) {
        const end = code.indexOf('"""', i + 3);
        if (end !== -1) {
          const content = code.substring(i + 3, end);
          const escaped = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
          const newlines = (content.match(/\n/g) || []).length;
          result += `"${escaped}"` + '\n'.repeat(newlines);
          i = end + 3; continue;
        }
      }
      if ((c === '"' || c === "'") && !inString) { inString = true; stringChar = c; result += c; i++; continue; }
      if (c === stringChar && inString) { inString = false; result += c; i++; continue; }
      if (c === '!' && next === '!' && !inString) {
        const end = code.indexOf('!!', i + 2);
        if (end !== -1) {
          const chunk = code.substring(i, end + 2);
          result += '\n'.repeat((chunk.match(/\n/g) || []).length); i = end + 2; continue;
        }
      }
      result += c; i++;
    }
    return result;
  }

  parseModeFlags(code) {
    for (const line of code.split('\n')) {
      const s = this.stripInlineComment(line.trim()).trim();
      if (!s || s.startsWith('#')) continue;
      if (s === 'enable creator') { this.creatorMode = true; continue; }
      if (s === 'disable creator') { this.creatorMode = false; continue; }
      if (s === 'enable debug') { this.debugMode = true; continue; }
      if (s === 'disable debug') { this.debugMode = false; continue; }
      if (s.startsWith('module ') || s.startsWith('spark ')) return;
    }
  }

  validate(code) {
    const lines = code.split('\n'), errors = [];
    const getInd = l => (l.match(/^(\s*)/)?.[1] || '').length;
    const hasModule = lines.some(l => /^module\s+littlestar\s*:/.test(this.stripInlineComment(l.trim()).trim()));
    if (!hasModule) {
      errors.push({ msg: `🌟 Missing 'module littlestar:'`, hint: `Every file must start with:\n    module littlestar:` });
      return errors;
    }
    const mainNums = [], printCalls = [];
    let hasPrint = false, inPrint = false, printIndent = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i], s = this.stripInlineComment(line.trim()).trim(), ind = getInd(line);
      if (!s) continue;
      if (/^spark\s+main\s*\(\s*\)\s*:$/.test(s)) errors.push({ msg: `🌟 Line ${i + 1}: main() needs a number.`, line: i + 1 });
      const mm = s.match(/^spark\s+main\s*\((\d+)\)\s*:$/);
      if (mm) mainNums.push(parseInt(mm[1]));
      if (/^spark\s+print\s*:$/.test(s)) { hasPrint = true; inPrint = true; printIndent = ind; continue; }
      if (inPrint) {
        if (s && ind <= printIndent && !/^main\s*\(/.test(s)) inPrint = false;
        else { const cm = s.match(/^main\s*\((\d+)\)\s*$/); if (cm) printCalls.push({ num: parseInt(cm[1]), line: i + 1 }); }
      }
    }
    if (!hasPrint) errors.push({ msg: `🌟 Missing 'spark print:'`, hint: `Add:\n    spark print:\n        main(1)` });
    const sorted = [...mainNums].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) { errors.push({ msg: `🌟 main(${i + 1}) is missing!`, hint: `Numbers must be sequential.` }); break; }
    }
    for (const c of printCalls)
      if (!mainNums.includes(c.num)) errors.push({ msg: `🌟 Line ${c.line}: main(${c.num}) doesn't exist.`, line: c.line });
    return errors;
  }

  parseDbs(lines) {
    let inDb = false, currentDb = null, currentRec = null, records = [];
    for (const line of lines) {
      const s = this.stripInlineComment(line.trim()).trim();
      if (/^module\s+littlestardb\s*:/.test(s)) { inDb = true; continue; }
      if (inDb && s.startsWith('module ') && !s.includes('littlestardb')) { inDb = false; continue; }
      if (!inDb || !s) continue;
      const rm = s.match(/^removedb\s+(\w+)\s*$/);
      if (rm) { if (currentDb) { if (currentRec) records.push(currentRec); this.dbs[currentDb] = records; currentDb = null; currentRec = null; records = []; } delete this.dbs[rm[1]]; continue; }
      const dbM = s.match(/^createdb\s+(\w+)\s*:$/);
      if (dbM) { if (currentDb) { if (currentRec) records.push(currentRec); this.dbs[currentDb] = records; } currentDb = dbM[1]; records = []; currentRec = null; continue; }
      const fm = s.match(/^(\w+)\s*:\s*(.+)$/);
      if (fm) {
        const key = fm[1]; let val = fm[2].trim();
        const isVal = val.startsWith("'") || val.startsWith('"') || !isNaN(Number(val.replace(/,$/, '').trim())) || val === 'yes' || val === 'no';
        if (isVal) {
          if (!currentRec) currentRec = {};
          val = val.replace(/,$/, '').trim();
          if (val.startsWith("'") || val.startsWith('"')) val = val.slice(1, -1);
          else if (!isNaN(Number(val))) val = Number(val);
          else if (val === 'yes') val = true;
          else if (val === 'no') val = false;
          currentRec[key] = val;
        } else { if (currentRec) records.push(currentRec); currentRec = {}; }
        continue;
      }
      if (/^[\w\s]+:$/.test(s)) { if (currentRec) records.push(currentRec); currentRec = {}; }
    }
    if (currentDb) { if (currentRec) records.push(currentRec); this.dbs[currentDb] = records; }
  }

  extractMains(lines) {
    const mains = {}, getInd = l => (l.match(/^(\s*)/)?.[1] || '').length;
    let cur = null, body = [], ind0 = -1;
    for (const line of lines) {
      const s = this.stripInlineComment(line.trim()).trim(), ind = getInd(line);
      const mm = s.match(/^spark\s+main\s*\((\d+)\)\s*:$/);
      if (mm) { if (cur !== null) mains[cur] = body; cur = parseInt(mm[1]); body = []; ind0 = ind; continue; }
      if (/^spark\s+print\s*:$/.test(s) || (s.startsWith('module ') && ind === 0)) { if (cur !== null) { mains[cur] = body; cur = null; } continue; }
      if (cur !== null && (ind > ind0 || !s)) body.push(line);
    }
    if (cur !== null) mains[cur] = body;
    return mains;
  }

  extractPrintOrder(lines) {
    const calls = []; let inP = false, pInd = -1;
    const getInd = l => (l.match(/^(\s*)/)?.[1] || '').length;
    for (const line of lines) {
      const s = this.stripInlineComment(line.trim()).trim(), ind = getInd(line);
      if (/^spark\s+print\s*:$/.test(s)) { inP = true; pInd = ind; continue; }
      if (inP) {
        if (s && ind <= pInd) inP = false;
        else { const cm = s.match(/^main\s*\((\d+)\)\s*$/); if (cm) calls.push(parseInt(cm[1])); }
      }
    }
    return calls;
  }

  // ═══════════════════════════════════════════════════════════════
  //  CORE EVALUATOR
  // ═══════════════════════════════════════════════════════════════
  eval(expr) {
    expr = expr.trim();
    if (!expr) return '';
    let cleaned = '', inStr = false, strCh = '';
    for (let i = 0; i < expr.length; i++) {
      const c = expr[i];
      if ((c === '"' || c === "'") && !inStr) { inStr = true; strCh = c; }
      else if (c === strCh && inStr) { inStr = false; }
      if (c === '#' && !inStr) break;
      cleaned += c;
    }
    expr = cleaned.trim();

    const strings = [];
    expr = expr.replace(/(['"])((?:\\.|(?!\1).)*)\1/g, match => {
      const idx = strings.length; strings.push(match); return `__STR_${idx}__`;
    });

    expr = expr
      .replace(/<>/g, '!=').replace(/\band\b/g, '&&').replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!').replace(/\s&\s/g, ' && ')
      .replace(/\byes\b/g, 'true').replace(/\bno\b/g, 'false').replace(/\blbr\b/g, '"\\n"')
      .replace(/\bmod\b/g, '%');

    expr = expr.replace(/\b(\w+)\[([^\]]+)\]/g, (match, name, index) => {
      if (name.startsWith('__')) return match;
      return `(${name}[${index}])`;
    });

    const CONSTANTS = {
      pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: 1.618033988749895, inf: Infinity, ninf: -Infinity, nan: NaN,
      sqrt2: Math.SQRT2, sqrt3: Math.sqrt(3), ln2: Math.LN2, ln10: Math.LN10, log2e: Math.LOG2E, log10e: Math.LOG10E,
      c: 299792458, g: 9.80665, avogadro: 6.02214076e23, planck: 6.62607015e-34, boltzmann: 1.380649e-23,
      earthmass: 5.972e24, sunmass: 1.989e30, au: 149597870700, lightyear: 9.461e15, parsec: 3.086e16,
      yeardays: 365.25, weekdays: 7, hoursec: 3600, daysec: 86400, yearsec: 31557600,
      dayslist: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      newline: '\n', tab: '\t', space: ' ', empty: '', version: '2.0-cli', author: 'Godspower Kenneth U.', langname: 'Littlestar',
      unionSymbol: '∪', intersectionSymbol: '∩', subsetSymbol: '⊆', supersetSymbol: '⊇',
      properSubsetSymbol: '⊂', properSupersetSymbol: '⊃', emptySetSymbol: '∅', elementOfSymbol: '∈', notElementOfSymbol: '∉', universalSetSymbol: '𝕌'
    };

    const ACTIVE_CURRENCY = this.currencyRates || CURRENCY;
    const CURRENCY_CODES = Object.keys(ACTIVE_CURRENCY);
    const UNIT_NAMES = ['meter', 'cm', 'mm', 'inch', 'ft', 'yard', 'mile', 'kg', 'mg', 'lb', 'oz', 'ton',
      'ms', 'min', 'hour', 'day', 'week', 'year', 'decade', 'century', 'millennium',
      'KB', 'MB', 'GB', 'TB', 'PB', 'mL', 'gallon', 'quart', 'pint', 'cup', 'deg', 'rad', 'fps', 'mph'];
    const ALL_UNITS = new Set([...CURRENCY_CODES, ...UNIT_NAMES]);

    // Auto-quote units
    for (const fn of ['convertCurrency', 'convert']) {
      expr = expr.replace(new RegExp(`${fn}\\s*\\(([^)]*)\\)`, 'g'), (match, args) => {
        const parts = this.splitArgs(args);
        const quoted = parts.map((arg, idx) => {
          if (idx === 0) return arg;
          const t = arg.trim(); return ALL_UNITS.has(t) ? `"${t}"` : arg;
        }).join(',');
        return `${fn}(${quoted})`;
      });
    }

    const SHAPE_NAMES = new Set(['circle', 'square', 'rectangle', 'triangle', 'trapezoid', 'parallelogram', 'rhombus', 'ellipse', 'pentagon', 'hexagon', 'cube', 'sphere', 'cylinder', 'cone', 'pyramid', 'cuboid', 'prism', 'hemisphere', 'ellipsoid']);

    // Auto-quote DBs
    for (const fn of ['fetch', 'countdb', 'hasdb']) {
      expr = expr.replace(new RegExp(`\\b${fn}\\s*\\(([^)]+)\\)`, 'g'), (match, args) => {
        const argStr = args.trim();
        if (/^[a-zA-Z0-9_.]+$/.test(argStr) && !argStr.startsWith('"') && !argStr.startsWith("'")) return `${fn}("${argStr}")`;
        return match;
      });
    }

    // Auto-quote Shapes
    for (const fn of ['area', 'perimeter', 'volume']) {
      expr = expr.replace(new RegExp(`\\b${fn}\\s*\\(([^)]*)\\)`, 'g'), (match, argsStr) => {
        const args = this.splitArgs(argsStr);
        if (args.length > 0) { const first = args[0].trim(); if (SHAPE_NAMES.has(first)) args[0] = `"${first}"`; }
        return `${fn}(${args.join(',')})`;
      });
    }

    const self = this;
    const shapeBuiltins = {
      area: (...a) => self.computeShape('area', a),
      perimeter: (...a) => self.computeShape('perimeter', a),
      volume: (...a) => self.computeShape('volume', a),
    };

    const B = {
      sqrt: x => { if (x < 0) { const r = Math.sqrt(-x); return r === 1 ? 'i' : r + 'i'; } return Math.sqrt(x); },
      square: x => x * x, cbrt: Math.cbrt, cube: x => x * x * x, pow: Math.pow,
      lcm: (...args) => { const g = (x, y) => y ? g(y, x % y) : x; const l = (a, b) => Math.abs(a * b) / g(a, b); return args.reduce((a, b) => l(a, b)); },
      hcf: (...args) => { const g = (x, y) => y ? g(y, x % y) : x; return args.reduce((a, b) => g(a, b)); },
      gcd: (...args) => { const g = (x, y) => y ? g(y, x % y) : x; return args.reduce((a, b) => g(a, b)); },
      abs: Math.abs, approximate: Math.round,
      round: (n, d = 0) => { const p = Math.pow(10, d); return Math.round(n * p) / p; },
      decimals: (n, d) => Number(Number(n).toFixed(d)),
      min: (...args) => Math.min(...(args.length === 1 && Array.isArray(args[0]) ? args[0] : args)),
      max: (...args) => Math.max(...(args.length === 1 && Array.isArray(args[0]) ? args[0] : args)),
      exp: Math.exp, floor: Math.floor, ceil: Math.ceil, sign: Math.sign,
      log: (n, b) => b ? Math.log(n) / Math.log(b) : Math.log(n), ln: Math.log,
      log10: (n, b) => b ? Math.log(n) / Math.log(b) : Math.log10(n), log2: Math.log2,
      logbase: (n, b) => Math.log(n) / Math.log(b), antilog: (n, b = 10) => Math.pow(b, n),
      sin: d => Math.sin(d * Math.PI / 180), cos: d => Math.cos(d * Math.PI / 180), tan: d => Math.tan(d * Math.PI / 180),
      asin: n => Math.asin(n) * 180 / Math.PI, acos: n => Math.acos(n) * 180 / Math.PI, atan: n => Math.atan(n) * 180 / Math.PI,
      radsin: Math.sin, radcos: Math.cos, radtan: Math.tan,
      gradsin: g => Math.sin(g * Math.PI / 200), gradcos: g => Math.cos(g * Math.PI / 200), gradtan: g => Math.tan(g * Math.PI / 200),
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
      logsin: d => Math.log10(Math.sin(d * Math.PI / 180)), logcos: d => Math.log10(Math.cos(d * Math.PI / 180)), logtan: d => Math.log10(Math.tan(d * Math.PI / 180)),
      degrad: d => d * Math.PI / 180, degtorad: d => d * Math.PI / 180, raddeg: r => r * 180 / Math.PI, radtodeg: r => r * 180 / Math.PI,
      factorial: n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; },
      facsum: n => { let r = 0; for (let i = 1; i <= n; i++) r += i; return r; },
      facsq: n => { let r = 0; for (let i = 1; i <= n; i++) r += i * i; return r; },
      faccube: n => { let r = 0; for (let i = 1; i <= n; i++) r += i * i * i; return r; },
      facdifference: n => { let r = 1; for (let i = 2; i <= n; i++) r -= i; return r; },
      fibonacci: n => { if (n < 1) return 0; if (n === 1) return 1; let a = 0, b = 1; for (let i = 2; i <= n; i++) { const t = a + b; a = b; b = t; } return b; },
      quadratic: (a, b, c) => {
        const d = b * b - 4 * a * c;
        if (a === 0) { if (b === 0) return c === 0 ? "infinite solutions" : "no solution"; return [-c / b]; }
        if (d > 0) { const s = Math.sqrt(d); return [(-b + s) / (2 * a), (-b - s) / (2 * a)]; }
        if (d === 0) return [-b / (2 * a)];
        const re = Math.round((-b / (2 * a)) * 1e10) / 1e10;
        const im = Math.round((Math.sqrt(-d) / (2 * a)) * 1e10) / 1e10;
        const imStr = im === 1 ? "i" : im + "i";
        if (re === 0) return [imStr, "-" + imStr];
        return [re + "+" + imStr, re + "-" + imStr];
      },
      isPrime: n => { if (n < 2) return false; if (n === 2) return true; if (n % 2 === 0) return false; for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false; return true; },
      primes: n => { const r = []; let num = 2; while (r.length < n) { let p = true; for (let i = 2; i * i <= num; i++) if (num % i === 0) { p = false; break; } if (p) r.push(num); num++; } return r; },
      isEven: n => Number(n) % 2 === 0, isOdd: n => Number(n) % 2 !== 0,
      evens: n => { const r = []; for (let i = 2; r.length < n; i += 2) r.push(i); return r; },
      odds: n => { const r = []; for (let i = 1; r.length < n; i += 2) r.push(i); return r; },
      evensBetween: (a, b) => { const r = []; const s = a % 2 === 0 ? a : a + 1; for (let i = s; i <= b; i += 2) r.push(i); return r; },
      oddsBetween: (a, b) => { const r = []; const s = a % 2 !== 0 ? a : a + 1; for (let i = s; i <= b; i += 2) r.push(i); return r; },
      math: s => { try { return Function("return (" + String(s).replace(/pi/g, Math.PI).replace(/\be\b/g, Math.E) + ")")(); } catch (e) { return NaN; } },
      nthroot: (x, n) => { if (n === 0) return NaN; if (x < 0 && n % 2 === 0) return NaN; return x < 0 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n); },
      mod: (a, b) => ((a % b) + b) % b, percent: (a, b) => (a / 100) * b,
      distance: (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)),
      fraction: (d, md = 10000) => { const s = d < 0 ? -1 : 1; d = Math.abs(d); const i = Math.floor(d); d = d - i; if (d < 1e-10) return s * i + "/1"; let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = d; while (true) { const a = Math.floor(b); const h2 = a * h1 + h0; const k2 = a * k1 + k0; if (k2 > md) break; h0 = h1; h1 = h2; k0 = k1; k1 = k2; if (Math.abs(d - h1 / k1) < 1e-10) break; b = 1 / (b - a); } const n = i * k1 + h1; return (s < 0 ? "-" : "") + n + "/" + k1; },
      image: (src, w, h) => ({ __isImage: true, src: String(src), width: w || null, height: h || null }),
      add: (arr, item) => { arr.push(item); return arr; }, addFirst: (arr, item) => { arr.unshift(item); return arr; },
      insertAt: (arr, i, item) => { arr.splice(i, 0, item); return arr; }, remove: arr => { arr.pop(); return arr; },
      removeFirst: arr => { arr.shift(); return arr; }, removeAt: (arr, i) => { arr.splice(i, 1); return arr; },
      removeItem: (arr, item) => { const i = arr.indexOf(item); if (i > -1) arr.splice(i, 1); return arr; },
      pop: arr => { arr.length = 0; return arr; }, clear: arr => { arr.length = 0; return arr; },
      contains: (arr, item) => arr.indexOf(item) !== -1, indexOf: (arr, item) => arr.indexOf(item),
      slice: (arr, start, end) => arr.slice(start, end), concat: (a, b) => [...a, ...b],
      sort: a => [...a].sort((x, y) => typeof x === "number" ? x - y : String(x).localeCompare(y)),
      dsort: a => [...a].sort((x, y) => typeof x === "number" ? y - x : String(y).localeCompare(x)),
      join: (a, s) => Array.isArray(a) ? a.join(s || "") : String(a) + String(s || ""),
      avg: (...args) => { const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args; return a.reduce((x, y) => x + y, 0) / a.length; },
      sum: (...args) => { const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args; return a.reduce((x, y) => x + y, 0); },
      variance: (...args) => { const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args; const m = a.reduce((x, y) => x + y, 0) / a.length; return a.reduce((s, v) => s + Math.pow(v - m, 2), 0) / a.length; },
      stddev: (...args) => { const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + Math.pow(v - m, 2), 0) / a.length); },
      range: (...args) => { const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args; return Math.max(...a) - Math.min(...a); },
      median: (...args) => { const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
      mode: a => { const c = {}; a.forEach(x => c[x] = (c[x] || 0) + 1); return Object.keys(c).reduce((r, k) => c[k] > c[r] ? k : r); },
      unique: a => [...new Set(a)], first: a => a[0], last: a => a[a.length - 1], count: (a, x) => a.filter(i => i === x).length,
      reverse: s => Array.isArray(s) ? [...s].reverse() : String(s).split("").reverse().join(""),
      map: (arr, fn) => { if (typeof fn !== "function") return arr; return arr.map(x => fn(x)); },
      filter: (arr, fn) => { if (typeof fn !== "function") return arr; return arr.filter(x => fn(x)); },
      flatten: arr => arr.reduce((a, b) => Array.isArray(b) ? a.concat(b) : [...a, b], []),
      chunk: (arr, n) => { const r = []; for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n)); return r; },
      zip: (a, b) => { const r = []; const m = Math.min(a.length, b.length); for (let i = 0; i < m; i++) r.push([a[i], b[i]]); return r; },
      bin: n => Number(n).toString(2), oct: n => Number(n).toString(8), hex: n => Number(n).toString(16).toUpperCase(),
      toInt: parseInt, toNum: parseFloat, toStr: String,
      upper: s => String(s).toUpperCase(), lower: s => String(s).toLowerCase(),
      sentence: s => { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); },
      toggle: s => String(s).split("").map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(""),
      trim: s => String(s).trim(), includes: (s, x) => String(s).includes(x),
      charAt: (s, i) => String(s).charAt(i), pick: (s, i) => String(s).charAt(i),
      startsWith: (s, x) => String(s).startsWith(x), endsWith: (s, x) => String(s).endsWith(x),
      repeat: (s, n) => String(s).repeat(n), replace: (s, a, b) => String(s).replace(a, b),
      split: (s, sep) => String(s).split(sep), padLeft: (s, n, ch = " ") => String(s).padStart(n, ch), padRight: (s, n, ch = " ") => String(s).padEnd(n, ch),
      wordCount: s => { const t = String(s).trim(); return t ? t.split(/\s+/).length : 0; },
      capitalize: s => String(s).split(" ").map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w).join(" "),
      isStr: x => typeof x === "string", isNum: x => typeof x === "number" && !isNaN(x),
      isArr: Array.isArray, isObj: x => typeof x === "object" && x !== null && !Array.isArray(x),
      isBool: x => typeof x === "boolean", type: x => Array.isArray(x) ? "array" : typeof x, len: x => x ? x.length : 0,
      isWhole: x => typeof x === "number" && !isNaN(x) && x === Math.floor(x),
      isInteger: x => typeof x === "number" && !isNaN(x) && x === Math.floor(x),
      isDecimal: x => typeof x === "number" && !isNaN(x) && x !== Math.floor(x),
      isPositive: x => typeof x === "number" && !isNaN(x) && x > 0,
      isNegative: x => typeof x === "number" && !isNaN(x) && x < 0,
      isZero: x => typeof x === "number" && !isNaN(x) && x === 0,
      random: Math.random, randInt: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a, randText: (n = 5) => Math.random().toString(36).substr(2, n),
      randomChoose: (...args) => { const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args; return a[Math.floor(Math.random() * a.length)]; },
      randomChoice: (...args) => B.randomChoose(...args),
      datenow: () => new Date().toLocaleDateString(), timenow: () => new Date().toLocaleTimeString(),
      yearnow: () => new Date().getFullYear(), monthnow: () => new Date().getMonth() + 1,
      daynow: () => new Date().getDate(), hournow: () => new Date().getHours(), minutenow: () => new Date().getMinutes(), secondnow: () => new Date().getSeconds(),
      months: () => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      days: () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      weekdayNow: () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()],
      elapsed: start => Date.now() - Number(start), timestamp: () => Date.now(),
      format: (d, pat) => { const dt = (typeof d === "number") ? new Date(d) : (d instanceof Date ? d : new Date()); const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; const Ms = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; const D = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; const Ds = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; const pad = (n, w = 2) => String(n).padStart(w, "0"); return String(pat).replace(/YYYY/g, dt.getFullYear()).replace(/MMMM/g, M[dt.getMonth()]).replace(/MMM/g, Ms[dt.getMonth()]).replace(/MM/g, pad(dt.getMonth() + 1)).replace(/DD/g, pad(dt.getDate())).replace(/dddd/g, D[dt.getDay()]).replace(/dd/g, Ds[dt.getDay()]).replace(/HH/g, pad(dt.getHours())).replace(/mm/g, pad(dt.getMinutes())).replace(/ss/g, pad(dt.getSeconds())); },
      hash: s => { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0 } return h.toString(16) },
      search: (source, term) => String(source).indexOf(String(term)) !== -1,
      calc: (op, a, b) => { if (op === "+") return a + b; if (op === "-") return a - b; if (op === "*") return a * b; if (op === "/") return a / b; return 0; },
      convert: (val, fromUnit, toUnit) => { for (const cat of Object.keys(UNITS)) { const c = UNITS[cat]; if (c[fromUnit] !== undefined && c[toUnit] !== undefined) { return val * c[fromUnit] / c[toUnit]; } } return val; },
      convertCurrency: (val, from, to) => { const f = ACTIVE_CURRENCY[from] || 1, t = ACTIVE_CURRENCY[to] || 1; return (val / f) * t; },
      comma: n => { if (typeof n !== 'number' || isNaN(n)) return String(n); const parts = n.toString().split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return parts.join('.'); },
      fetch: n => { if (Array.isArray(n)) return n; let parts = String(n).split('.'); let dbName = parts[0]; let idx = parts[1] ? parseInt(parts[1]) - 1 : -1; let d = this.dbs[dbName] || []; return idx >= 0 ? (d[idx] || {}) : d; },
      countdb: n => { let dbName = String(n).split('.')[0]; const d = this.dbs[dbName]; return d ? d.length : 0; },
      hasdb: n => { let dbName = String(n).split('.')[0]; return this.dbs[dbName] !== undefined; }, listdbs: () => Object.keys(this.dbs),
      read: f => { try { return fs.readFileSync(String(f), 'utf8'); } catch (e) { return ""; } },
      write: (f, c) => { try { fs.writeFileSync(String(f), String(c)); return true; } catch (e) { return false; } },
      append: (f, c) => { try { fs.appendFileSync(String(f), String(c)); return true; } catch (e) { return false; } },
      exists: f => { try { return fs.existsSync(String(f)); } catch (e) { return false; } },
      jsonParse: s => { try { return JSON.parse(String(s)); } catch (e) { return null; } },
      jsonStringify: o => { try { return JSON.stringify(o); } catch (e) { return ""; } },
      solve: eq => { eq = String(eq).replace(/\s/g, '').replace(/\*\*/g, '^'); let lhs, rhs; if (eq.includes('=')) { const p = eq.split('='); lhs = p[0]; rhs = p[1] || '0'; } else { lhs = eq; rhs = '0'; } const vMatch = (lhs + rhs).match(/[a-zA-Z]/); const v = vMatch ? vMatch[0] : 'x'; function parseSide(str) { str = str.replace(/-/g, '+-'); if (str.startsWith('+')) str = str.substring(1); const terms = str.split('+').filter(t => t.length > 0); let a = 0, b = 0, c = 0; for (let t of terms) { let sign = 1; if (t.startsWith('-')) { sign = -1; t = t.substring(1); } if (!t) continue; const sqPattern = new RegExp('^(.*?)' + v + '\\^2$|^(.*?)' + v + '\\*' + v + '$|^(.*?)' + v + '²$'); const sqM = t.match(sqPattern); if (sqM) { const coefStr = (sqM[1] || sqM[2] || sqM[3] || '').replace(/\*$/, '') || '1'; a += sign * (coefStr === '+' || coefStr === '' ? 1 : Number(coefStr)); continue; } const linPattern = new RegExp('^(.*?)' + v + '$'); const linM = t.match(linPattern); if (linM) { const coefStr = linM[1].replace(/\*$/, '') || '1'; b += sign * (coefStr === '+' || coefStr === '' ? 1 : Number(coefStr)); continue; } const num = Number(t); if (!isNaN(num)) c += sign * num; } return { a, b, c }; } const L = parseSide(lhs), R = parseSide(rhs); const a = L.a - R.a, b = L.b - R.b, c = L.c - R.c; if (a !== 0) { const disc = b * b - 4 * a * c; if (disc > 0) { const s = Math.sqrt(disc); const r1 = Math.round(((-b + s) / (2 * a)) * 1e10) / 1e10; const r2 = Math.round(((-b - s) / (2 * a)) * 1e10) / 1e10; return v + ' = ' + r1 + ' or ' + v + ' = ' + r2; } if (disc === 0) { const r = Math.round((-b / (2 * a)) * 1e10) / 1e10; return v + ' = ' + r + ' (double root)'; } const re = Math.round((-b / (2 * a)) * 1e10) / 1e10; const im = Math.round((Math.sqrt(-disc) / (2 * a)) * 1e10) / 1e10; const imStr = im === 1 ? "i" : im + "i"; if (re === 0) { return v + ' = ' + imStr + ' or ' + v + ' = -' + imStr; } return v + ' = ' + re + '+' + imStr + ' or ' + v + ' = ' + re + '-' + imStr; } if (b !== 0) { const r = Math.round((-c / b) * 1e10) / 1e10; return v + ' = ' + r; } return c === 0 ? 'infinite solutions' : 'no solution'; },
      simultaneousLinear: (eq1, eq2) => { const combined = (eq1 + eq2).replace(/\s/g, ''); const varMatches = combined.match(/[a-zA-Z]/g) || []; const uniqueVars = [...new Set(varMatches)]; if (uniqueVars.length < 2) return { error: "Need two different variables" }; const var1 = uniqueVars[0]; const var2 = uniqueVars[1]; function parse(eq, v1, v2) { eq = String(eq).replace(/\s/g, ''); const parts = eq.split('='); const lhs = parts[0], rhs = Number(parts[1]) || 0; let a = 0, b = 0; const terms = lhs.replace(/-/g, '+-').split('+').filter(t => t); for (const t of terms) { const s = t.trim(); if (s.includes(v1)) { const c = s.replace(v1, '').replace(/\*/g, '') || '1'; a += c === '-' ? -1 : Number(c); } else if (s.includes(v2)) { const c = s.replace(v2, '').replace(/\*/g, '') || '1'; b += c === '-' ? -1 : Number(c); } } return { a, b, c: rhs }; } const e1 = parse(eq1, var1, var2), e2 = parse(eq2, var1, var2); const det = e1.a * e2.b - e2.a * e1.b; if (det === 0) return e1.a * e2.c === e2.a * e1.c ? 'infinite solutions' : 'no solution'; const val1 = (e1.c * e2.b - e2.c * e1.b) / det; const val2 = (e1.a * e2.c - e2.a * e1.c) / det; const result = {}; result[var1] = Math.round(val1 * 1e10) / 1e10; result[var2] = Math.round(val2 * 1e10) / 1e10; return result; },
      mathset: (op, ...args) => { op = String(op).toLowerCase(); const toSet = (a) => Array.isArray(a) ? [...new Set(a)] : [...new Set([a])]; const A = args[0] ? toSet(args[0]) : []; const Bset = args[1] ? toSet(args[1]) : []; if (op === 'union') return [...new Set([...A, ...Bset])]; if (op === 'intersection') return A.filter(x => Bset.includes(x)); if (op === 'difference') return A.filter(x => !Bset.includes(x)); if (op === 'symmetric' || op === 'symmetricdifference') return [...A.filter(x => !Bset.includes(x)), ...Bset.filter(x => !A.includes(x))]; if (op === 'issubset') return A.every(x => Bset.includes(x)); if (op === 'issuperset') return Bset.every(x => A.includes(x)); if (op === 'ispropersubset') return A.every(x => Bset.includes(x)) && A.length < Bset.length; if (op === 'ispropersuperset') return Bset.every(x => A.includes(x)) && Bset.length < A.length; if (op === 'isequal' || op === 'equals') return A.length === Bset.length && A.every(x => Bset.includes(x)); if (op === 'isdisjoint') return A.every(x => !Bset.includes(x)); if (op === 'complement') { const U = args[1] ? toSet(args[1]) : []; return U.filter(x => !A.includes(x)); } if (op === 'powerset') { const r = [[]]; for (const x of A) { const n = r.length; for (let i = 0; i < n; i++) r.push([...r[i], x]); } return r; } if (op === 'cartesian') { const r = []; for (const a of A) for (const b of Bset) r.push([a, b]); return r; } if (op === 'cardinality' || op === 'size') return A.length; if (op === 'ismember' || op === 'contains') return A.includes(args[1]); if (op === 'add') { if (!A.includes(args[1])) A.push(args[1]); return A; } if (op === 'remove') return A.filter(x => x !== args[1]); if (op === 'toset') return A; return A; }
    };

    const sortedKeys = Object.keys(B).sort((a, b) => b.length - a.length);
    const fnPlaceholders = {}; let fnIdx = 0;
    for (const k of sortedKeys) {
      expr = expr.replace(new RegExp(`\\b${k}\\b(?=\\()`, 'g'), () => {
        const ph = `__FN_${fnIdx}__`; fnPlaceholders[ph] = B[k]; fnIdx++; return ph;
      });
    }

    expr = expr.replace(/__STR_(\d+)__/g, (_, i) => {
      const original = strings[parseInt(i)];
      const quote = original[0];
      const inner = original.slice(1, -1);
      let hasValidInterp = false;
      const testRegex = /\{([^}]+)\}/g; let testMatch;
      while ((testMatch = testRegex.exec(inner)) !== null) {
        const inside = testMatch[1].trim();
        if (inside && /^[a-zA-Z_(\-]/.test(inside) && !/[:;]/.test(inside)) { hasValidInterp = true; break; }
        if (inside && /^[\d]/.test(inside) && /[+\-*/]/.test(inside)) { hasValidInterp = true; break; }
      }
      if (hasValidInterp) {
        const parts = []; let lastIndex = 0, m;
        const regex = /\{([^}]+)\}/g;
        while ((m = regex.exec(inner)) !== null) {
          const inside = m[1].trim();
          const isValid = (inside && /^[a-zA-Z_(\-]/.test(inside) && !/[:;]/.test(inside)) || (inside && /^[\d]/.test(inside) && /[+\-*/]/.test(inside));
          if (!isValid) continue;
          if (m.index > lastIndex) parts.push(`${quote}${inner.substring(lastIndex, m.index)}${quote}`);
          parts.push(`String(${inside})`);
          lastIndex = m.index + m[0].length;
        }
        if (lastIndex < inner.length) parts.push(`${quote}${inner.substring(lastIndex)}${quote}`);
        if (parts.length > 0) return '(' + parts.join('+') + ')';
      }
      return original;
    });

    for (const [ph, code] of Object.entries(fnPlaceholders)) {
      expr = expr.split(ph).join(`(__fn_${ph.replace(/\W/g, '_')})`);
    }

    const userFns = {};
    for (const [fnName, fn] of Object.entries(this.funcs)) {
      if (B[fnName]) continue;
      const capturedFn = fn;
      userFns[fnName] = (...args) => {
        const oldVars = { ...self.vars };
        capturedFn.params.forEach((p, i) => (self.vars[p] = args[i]));
        let rv = undefined;
        try { self.execBlockSync(capturedFn.body, 0); }
        catch (err) { if (err instanceof ReturnSignal) rv = err.value; else { self.vars = oldVars; throw err; } }
        self.vars = oldVars; return rv;
      };
    }

    const ctx = {
      ...CONSTANTS, ...this.vars, ...userFns, ...shapeBuiltins,
      __dbs: this.dbs, __curr: this.currencyRates || CURRENCY, __unitCats: UNITS,
      __ct: (a, b) => Array.isArray(a) ? a.indexOf(b) !== -1 : String(a).includes(String(b))
    };

    for (const [ph, fn] of Object.entries(fnPlaceholders)) { ctx[`__fn_${ph.replace(/\W/g, '_')}`] = fn; }

    try { return new Function(...Object.keys(ctx), `return (${expr})`)(...Object.values(ctx)); } 
    catch (e) {
      const um = e.message.match(/(\w+) is not defined/);
      if (um) throw new LittlestarError(`🌟 The variable '${um[1]}' hasn't been declared yet${this.lineTag()}.`, `Did you forget "declare ${um[1]} = ..." first?`);
      throw new LittlestarError(`🌟 Couldn't evaluate${this.lineTag()}: ${expr}`, e.message);
    }
  }

  execBlockSync(lines, base) {
    const getInd = l => (l.match(/^(\s*)/)?.[1] || '').length;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]; if (!line.trim()) { i++; continue; }
      const ind = getInd(line); if (ind < base) return i;
      const s = this.stripInlineComment(line.trim()).trim(); if (!s) { i++; continue; }
      this.execLineSync(s); i++;
    }
    return i;
  }

  execLineSync(line) {
    line = this.stripInlineComment(line.trim()).trim();
    if (!line || line.startsWith('#')) return;
    let rm = line.match(/^return(?:\s+(.+))?$/);
    if (rm) throw new ReturnSignal(rm[1] ? this.eval(rm[1]) : undefined);
    try { this.eval(line); } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  LINE / BLOCK EXECUTION
  // ═══════════════════════════════════════════════════════════════
  async execLine(line) {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    line = this.stripInlineComment(line); if (!line) return;

    const declMatch = line.match(/^(?:declare|make|fix|letarr|letset)\s+(\w+)/);
    if (declMatch && (declMatch[1] in this.vars)) {
      throw new LittlestarError(`🌟 Variable '${declMatch[1]}' is already declared${this.lineTag()}.`, `Use 'set ${declMatch[1]} = ...' to change its value.`);
    }

    if (line === 'enable creator' || line === 'disable creator') return;
    if (line === 'enable debug' || line === 'disable debug') return;
    if (line === 'stop') throw new BreakSignal();
    if (line === 'skip') throw new ContinueSignal();
    
    let rm = line.match(/^return(?:\s+(.+))?$/);
    if (rm) throw new ReturnSignal(rm[1] ? this.eval(rm[1]) : undefined);

    let slp = line.match(/^sleep\s*\((.+)\)\s*$/);
    if (slp) { await new Promise(r => setTimeout(r, Number(this.eval(slp[1])))); return; }

    let httpM = line.match(/^(?:declare|make)\s+(\w+)\s*=\s*(httpGet|httpPost|httpPut|httpDelete)\s*\((.*)\)\s*$/);
    if (httpM) {
      if (typeof fetch !== 'function') throw new LittlestarError(`HTTP requests require Node 18+`);
      const [, varName, method, rawArgs] = httpM;
      const args = this.splitArgs(rawArgs).map(a => this.eval(a.trim()));
      const url = String(args[0]);
      const fetchOpts = { method: method.replace('http', '').toUpperCase(), headers: {} };
      if (method === 'httpPost' || method === 'httpPut') {
        fetchOpts.body = args[1] !== undefined ? String(args[1]) : '';
        if (typeof fetchOpts.body === 'string' && fetchOpts.body.startsWith('{')) fetchOpts.headers['Content-Type'] = 'application/json';
        if (args[2]) fetchOpts.headers['Authorization'] = String(args[2]);
      } else { if (args[1]) fetchOpts.headers['Authorization'] = String(args[1]); }
      try { const res = await fetch(url, fetchOpts); this.vars[varName] = await res.text(); }
      catch (e) { throw new LittlestarError(`🌟 HTTP ${method} failed: ${e.message}`); }
      return;
    }

    let sw = line.match(/^swap\s+(\w+)\s*,\s*(\w+)\s*$/);
    if (sw) { const a = sw[1], b = sw[2]; const tmp = this.vars[a]; this.vars[a] = this.vars[b]; this.vars[b] = tmp; return; }

    let asrt = line.match(/^assert\s*\((.+)\)\s*$/);
    if (asrt) {
      const args = this.splitArgs(asrt[1]);
      if (!this.eval(args[0])) throw new LittlestarError(`🌟 Assertion failed${this.lineTag()}`, `Condition: ${args[0]}`);
      return;
    }

    if (line === 'lbr') { console.log(''); return; }

    let m = line.match(/^(display|shine|glow)\s*\((.+)\)\s*$/);
    if (m) {
      const text = this.format(this.eval(m[2]));
      if (m[1] === 'shine') console.log('✨ ' + text);
      else if (m[1] === 'glow') console.log('🌟 ' + text);
      else console.log(text); return;
    }

    // ── Input Prompts ──
    m = line.match(/^(?:declare|make|set)\s+(\w+)\s*=\s*choose\s*\((.*)\)\s*$/);
    if (m) {
      const args = this.splitArgs(m[2]);
      if (args.length < 2) throw new LittlestarError(`🌟 choose() needs a prompt and options.`);
      const prompt = String(this.eval(args[0]));
      const options = args.slice(1).map(a => this.eval(a.trim()));
      console.log('\n📋 ' + prompt);
      const index = readlineSync.keyInSelect(options.map(String), 'Choose an option:', { cancel: false });
      this.vars[m[1]] = options[index]; return;
    }

    m = line.match(/^(?:declare|make|set)\s+(\w+)\s*=\s*chooseMany\s*\((.*)\)\s*$/);
    if (m) {
      const args = this.splitArgs(m[2]);
      if (args.length < 2) throw new LittlestarError(`🌟 chooseMany() needs a prompt and options.`);
      const prompt = String(this.eval(args[0]));
      const options = args.slice(1).map(a => this.eval(a.trim()));
      console.log('\n📋 ' + prompt + ' (Enter comma-separated numbers)');
      options.forEach((opt, idx) => console.log(`  [${idx + 1}] ${opt}`));
      const ans = readlineSync.question('Selections: ');
      this.vars[m[1]] = ans.split(',').map(x => parseInt(x.trim()) - 1).filter(i => i >= 0 && i < options.length).map(i => options[i]);
      return;
    }

    m = line.match(/^(?:declare|make)\s+(\w+)\s*=\s*input\s*\((.*)\)\s*$/);
    if (m) { this.vars[m[1]] = readlineSync.question((m[2].trim() ? String(this.eval(m[2])) : 'Enter text:') + ' '); return; }
    m = line.match(/^(?:declare|make)\s+(\w+)\s*=\s*message\s*\((.*)\)\s*$/);
    if (m) { this.vars[m[1]] = readlineSync.question((m[2].trim() ? String(this.eval(m[2])) : 'Enter message:') + ' '); return; }
    m = line.match(/^(?:declare|make)\s+(\w+)\s*=\s*readNum\s*\((.*)\)\s*$/);
    if (m) {
      const v = readlineSync.question((m[2].trim() ? String(this.eval(m[2])) : 'Enter a number:') + ' ');
      if (isNaN(Number(v))) throw new LittlestarError(`🌟 '${v}' is not a number.`);
      this.vars[m[1]] = Number(v); return;
    }
    m = line.match(/^(?:declare|make)\s+(\w+)\s*=\s*readPassword\s*\((.*)\)\s*$/);
    if (m) { this.vars[m[1]] = readlineSync.question((m[2].trim() ? String(this.eval(m[2])) : 'Enter password:') + ' ', { hideEchoBack: true }); return; }
    m = line.match(/^(?:declare|make)\s+(\w+)\s*=\s*confirm\s*\((.*)\)\s*$/);
    if (m) { this.vars[m[1]] = readlineSync.keyInYNStrict(m[2].trim() ? String(this.eval(m[2])) : 'Are you sure?'); return; }
    m = line.match(/^alert\s*\((.*)\)\s*$/);
    if (m) { console.log('\n📢 ' + (m[1].trim() ? String(this.eval(m[1])) : 'Alert!')); readlineSync.question('Press Enter to continue...'); return; }

    m = line.match(/^letset\s+(\w+)\s*=\s*(.+)$/);
    if (m) {
      const raw = m[2].trim(); let arr; const parts = this.splitArgs(raw);
      if (parts.length > 1) { arr = parts.map(x => this.eval(x.trim())); } 
      else { try { const r = this.eval(raw); arr = Array.isArray(r) ? r : [r]; } catch (e) { arr = [raw]; } }
      this.vars[m[1]] = [...new Set(arr)]; return;
    }

    m = line.match(/^letarr\s+(\w+)\s*=\s*fetch\s*\((\w+)\.(\w+)\)\s*$/);
    if (m) { const db = this.dbs[m[2]] || []; const idx = parseInt(m[3]) - 1 || 0; this.vars[m[1]] = db[idx] || {}; return; }
    m = line.match(/^letarr\s+(\w+)\s*=\s*fetch\s*\((\w+)\)\s*$/);
    if (m) { this.vars[m[1]] = this.dbs[m[2]] || []; return; }
    m = line.match(/^letarr\s+(\w+)\s*=\s*(.+)$/);
    if (m) {
      const raw = m[2].trim();
      try { const r = this.eval(raw); if (Array.isArray(r)) { this.vars[m[1]] = r; return; } } catch (e) { }
      this.vars[m[1]] = this.splitArgs(raw).map(x => this.eval(x.trim())); return;
    }

    m = line.match(/^(?:declare|make)\s+(\w+)\s*=\s*(.+)$/);
    if (m) {
      const varName = m[1], expr = m[2].trim();
      const fnCall = expr.match(/^(\w+)\s*\((.*)\)\s*$/);
      if (fnCall && this.funcs[fnCall[1]]) {
        const fn = this.funcs[fnCall[1]]; const args = fnCall[2].trim() ? this.splitArgs(fnCall[2]).map(a => this.eval(a.trim())) : [];
        const oldVars = { ...this.vars }; fn.params.forEach((p, i) => (this.vars[p] = args[i])); let rv = undefined;
        try { await this.execBlock(fn.body, 0); } catch (err) { if (err instanceof ReturnSignal) rv = err.value; else { this.vars = oldVars; throw err; } }
        this.vars = oldVars; this.vars[varName] = rv; return;
      }
      this.vars[varName] = this.eval(expr); return;
    }

    m = line.match(/^fix\s+(\w+)\s*=\s*(.+)$/);
    if (m) { this.vars[m[1]] = this.eval(m[2]); this.fixed.add(m[1]); return; }

    m = line.match(/^set\s+(\w+)\s*=\s*(.+)$/);
    if (m) {
      if (this.fixed.has(m[1])) throw new LittlestarError(`🌟 '${m[1]}' is FIXED!`);
      if (!(m[1] in this.vars)) throw new LittlestarError(`🌟 '${m[1]}' was never declared.`);
      const varName = m[1], expr = m[2].trim();
      const fnCall = expr.match(/^(\w+)\s*\((.*)\)\s*$/);
      if (fnCall && this.funcs[fnCall[1]]) {
        const fn = this.funcs[fnCall[1]]; const args = fnCall[2].trim() ? this.splitArgs(fnCall[2]).map(a => this.eval(a.trim())) : [];
        const oldVars = { ...this.vars }; fn.params.forEach((p, i) => (this.vars[p] = args[i])); let rv = undefined;
        try { await this.execBlock(fn.body, 0); } catch (err) { if (err instanceof ReturnSignal) rv = err.value; else { this.vars = oldVars; throw err; } }
        this.vars = oldVars; this.vars[varName] = rv; return;
      }
      this.vars[varName] = this.eval(expr); return;
    }

    m = line.match(/^removedb\s+(\w+)\s*$/);
    if (m) { if (!this.dbs[m[1]]) throw new LittlestarError(`🌟 Database '${m[1]}' doesn't exist.`); delete this.dbs[m[1]]; console.log(`🗑️ Database '${m[1]}' removed.`); return; }
    m = line.match(/^del\s+(\w+)\s*$/);
    if (m) { if (m[1] in this.vars) { delete this.vars[m[1]]; this.fixed.delete(m[1]); return; } throw new LittlestarError(`🌟 Variable '${m[1]}' doesn't exist.`); }
    m = line.match(/^delete\s+file\s+(.+)$/);
    if (m) { const fn = m[1].trim().replace(/['"]/g, ''); if (fs.existsSync(fn)) { fs.unlinkSync(fn); console.log(`🗑️ Deleted file: ${fn}`); } else { console.log(`⚠️ File doesn't exist`); } return; }
    m = line.match(/^save\s+(\w+)\s+to\s+(.+)$/);
    if (m) {
      const dbName = m[1], filename = m[2].trim().replace(/['"]/g, ''); const data = this.dbs[dbName];
      if (!data) throw new LittlestarError(`🌟 Database '${dbName}' doesn't exist.`);
      let content = `# Littlestar DB: ${dbName}\n`;
      data.forEach((r, i) => { content += `Record ${i + 1}:\n`; for (const [k, v] of Object.entries(r)) content += `  ${k}: ${typeof v === 'string' ? `"${v}"` : v}\n`; content += '\n'; });
      fs.writeFileSync(filename, content); console.log(`💾 Saved '${dbName}' to ${filename}`); return;
    }

    m = line.match(/^(\w+)\s*\((.*)\)\s*$/);
    if (m && this.funcs[m[1]]) {
      const fn = this.funcs[m[1]]; const args = m[2].trim() ? this.splitArgs(m[2]).map(a => this.eval(a.trim())) : [];
      const oldVars = { ...this.vars }; fn.params.forEach((p, i) => (this.vars[p] = args[i]));
      try { await this.execBlock(fn.body, 0); } catch (err) { if (err instanceof ReturnSignal) { this.vars = oldVars; return; } this.vars = oldVars; throw err; }
      this.vars = oldVars; return;
    }

    try { this.eval(line); } catch (e) { if (e instanceof LittlestarError) throw e; throw new LittlestarError(`🌟 Unknown statement${this.lineTag()}: '${line}'`); }
  }

  async execBlock(lines, base) {
    const getInd = l => (l.match(/^(\s*)/)?.[1] || '').length;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]; if (!line.trim()) { i++; continue; }
      const ind = getInd(line); if (ind < base) return i;
      const s = this.stripInlineComment(line.trim()).trim(); if (!s) { i++; continue; }
      const srcIdx = this.sourceLines.indexOf(line); if (srcIdx !== -1) this.currentLine = srcIdx + 1;

      if (s === 'web:') {
        const webLines = []; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) { webLines.push(lines[j]); j++; }
        console.log(`[web: block skipped in CLI mode]`);
        i = j; continue;
      }

      let mm = s.match(/^match\s+(.+):$/);
      if (mm) {
        const value = this.eval(mm[1]); let j = i + 1, matched = false;
        while (j < lines.length) {
          const cline = lines[j]; if (!cline.trim()) { j++; continue; }
          const cind = getInd(cline); if (cind <= ind) break;
          const cs = this.stripInlineComment(cline.trim()).trim();
          const cm = cs.match(/^case\s+(.+):$/), dm = cs.match(/^default\s*:$/);
          if (cm) {
            const caseVals = this.splitArgs(cm[1]).map(v => this.eval(v.trim()));
            const cb = []; let k = j + 1;
            while (k < lines.length && (getInd(lines[k]) > cind || !lines[k].trim())) { cb.push(lines[k]); k++; }
            if (!matched && caseVals.some(v => v === value)) { await this.execBlock(cb, cind + 1); matched = true; }
            j = k;
          } else if (dm) {
            const db = []; let k = j + 1;
            while (k < lines.length && (getInd(lines[k]) > cind || !lines[k].trim())) { db.push(lines[k]); k++; }
            if (!matched) { await this.execBlock(db, cind + 1); matched = true; } j = k;
          } else j++;
        }
        i = j; continue;
      }

      let m = s.match(/^when\s+(.+):$/);
      if (m) {
        const condExpr = rewriteContains(m[1]); const cond = this.eval(condExpr);
        const block = []; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) { block.push(lines[j]); j++; }
        let done = false; if (cond) { await this.execBlock(block, ind + 1); done = true; }
        while (j < lines.length && lines[j].trim() && getInd(lines[j]) === ind) {
          const ns = this.stripInlineComment(lines[j].trim()).trim();
          const em = ns.match(/^elif\s+(.+):$/); const om = ns.match(/^otherwise\s*:$/);
          if (em) {
            const eb = []; let k = j + 1;
            while (k < lines.length && (getInd(lines[k]) > ind || !lines[k].trim())) { eb.push(lines[k]); k++; }
            if (!done && this.eval(rewriteContains(em[1]))) { await this.execBlock(eb, ind + 1); done = true; }
            j = k;
          } else if (om) {
            const ob = []; let k = j + 1;
            while (k < lines.length && (getInd(lines[k]) > ind || !lines[k].trim())) { ob.push(lines[k]); k++; }
            if (!done) await this.execBlock(ob, ind + 1); j = k; break;
          } else break;
        }
        i = j; continue;
      }

      if (s === 'repeat this:' || /^repeat\s+this\s*\(\s*\d+\s*\)\s*:$/.test(s)) {
        const repMatch = s.match(/^repeat\s+this\s*\(\s*(\d+)\s*\)\s*:$/); const times = repMatch ? parseInt(repMatch[1]) : 1;
        const block = []; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) { block.push(lines[j]); j++; }
        for (let ri = 0; ri < times; ri++) { try { await this.execBlock(block, ind + 1); } catch (err) { if (err instanceof BreakSignal) break; throw err; } }
        i = j; continue;
      }

      let forMatch = s.match(/^as\s+(\w+)\s+in\s+(.+)\s+till\s+(.+)\s*:$/);
      if (forMatch) {
        const varName = forMatch[1]; const startVal = Math.round(this.eval(forMatch[2])); const endVal = Math.round(this.eval(forMatch[3]));
        const block = []; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) { block.push(lines[j]); j++; }
        const step = startVal <= endVal ? 1 : -1; const oldVar = this.vars[varName]; const hadVar = varName in this.vars;
        let iter = 0, broke = false;
        for (let fi = startVal; step > 0 ? fi <= endVal : fi >= endVal; fi += step) {
          if (iter++ >= 10000) throw new LittlestarError(`🌟 For loop ran too many times.`);
          this.vars[varName] = fi;
          try { await this.execBlock(block, ind + 1); } catch (err) { if (err instanceof BreakSignal) { broke = true; break; } if (err instanceof ContinueSignal) continue; throw err; }
        }
        if (!hadVar) delete this.vars[varName]; else this.vars[varName] = oldVar;
        i = j; continue;
      }

      m = s.match(/^while\s+(.+):$/);
      if (m) {
        const cond = rewriteContains(m[1]); const block = []; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) { block.push(lines[j]); j++; }
        let iter = 0, broke = false, lastVarsSnapshot = JSON.stringify(this.vars), noChangeCount = 0;
        while (this.eval(cond) && iter < 10000 && !broke) {
          try { await this.execBlock(block, ind + 1); }
          catch (err) {
            if (err instanceof BreakSignal) { broke = true; break; }
            if (err instanceof ContinueSignal) {
              const nowSnapshot = JSON.stringify(this.vars);
              if (nowSnapshot === lastVarsSnapshot) {
                if (++noChangeCount >= 3) throw new LittlestarError(`🌟 Infinite loop detected via skip.`);
              } else { noChangeCount = 0; lastVarsSnapshot = nowSnapshot; }
              iter++; continue;
            }
            throw err;
          }
          lastVarsSnapshot = JSON.stringify(this.vars); noChangeCount = 0; iter++;
        }
        if (iter >= 10000) throw new LittlestarError(`🌟 Loop ran too many times.`);
        i = j; continue;
      }

      if (s === 'compile:') {
        const tb = []; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) { tb.push(lines[j]); j++; }
        let ok = false;
        try { await this.execBlock(tb, ind + 1); ok = true; } catch (e) { ok = false; }
        if (j < lines.length && this.stripInlineComment(lines[j].trim()).trim() === 'otherwise:' && getInd(lines[j]) === ind) {
          const cb = []; let k = j + 1;
          while (k < lines.length && (getInd(lines[k]) > ind || !lines[k].trim())) { cb.push(lines[k]); k++; }
          if (!ok) await this.execBlock(cb, ind + 1);
          j = k;
        }
        i = j; continue;
      }

      m = s.match(/^(?:(export|private)\s+)?func\s+(\w+)\s*\(([^)]*)\)\s*:$/);
      if (m) {
        const fnName = m[2]; const params = m[3].trim() ? this.splitArgs(m[3]).map(p => p.trim()) : [];
        const body = []; const fnIndent = ind; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > fnIndent || !lines[j].trim())) {
          if (lines[j].trim()) { const bc = this.stripInlineComment(lines[j].trim()).trim(); if (bc) { const ri = getInd(lines[j]) - fnIndent - 4; body.push(' '.repeat(Math.max(0, ri)) + bc); } }
          j++;
        }
        this.funcs[fnName] = { params, body, isPrivate: m[1] === 'private', isExported: m[1] === 'export' };
        i = j; continue;
      }

      m = s.match(/^(?:export\s+)?lion\s+(\w+)\s*:$/);
      if (m) {
        const body = []; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) { const bc = this.stripInlineComment(lines[j].trim()).trim(); if (bc) body.push(bc); j++; }
        for (const bl of body) await this.execLine(bl);
        i = j; continue;
      }

      m = s.match(/^letobj\s+(\w+)\s*:$/);
      if (m) {
        if (m[1] in this.vars) throw new LittlestarError(`🌟 Variable '${m[1]}' is already declared.`);
        const obj = {}; let j = i + 1;
        while (j < lines.length && (getInd(lines[j]) > ind || !lines[j].trim())) {
          const fm = this.stripInlineComment(lines[j].trim()).trim().match(/^(\w+)\s*:\s*(.+?),?$/);
          if (fm) obj[fm[1]] = this.eval(fm[2]);
          j++;
        }
        this.vars[m[1]] = obj; i = j; continue;
      }

      await this.execLine(s); i++;
    }
    return i;
  }

  async run(code) {
    this.reset();
    code = this.stripComments(code);
    this.sourceLines = code.split('\n');
    this.parseModeFlags(code);
    const errors = this.validate(code);
    if (errors.length > 0) {
      console.error('\n❌ Validation Errors:');
      errors.forEach(e => { console.error(`  • ${e.msg}`); if (e.hint) console.error(`    💡 ${e.hint}`); });
      process.exit(1);
    }
    const lines = code.split('\n');
    this.parseDbs(lines);
    const mains = this.extractMains(lines);
    const order = this.extractPrintOrder(lines);
    this.startTime = Date.now();
    await this.fetchCurrencyRates();
    if (this.debugMode) console.log('🐛 Debug mode enabled');
    try {
      for (const n of order) if (mains[n]) await this.execBlock(mains[n], 1);
      if (this.debugMode) console.log(`🐛 Done in ${Date.now() - this.startTime}ms`);
    } catch (e) {
      console.error(`\n❌ Execution Error: ${e.message}`);
      if (e.hint) console.error(`💡 ${e.hint}`);
      process.exit(1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  CLI ENTRY
// ═══════════════════════════════════════════════════════════════
const filePath = process.argv[2];

if (!filePath) {
  console.log('🌟 Littlestar CLI v2.0');
  console.log('Usage: node littlestar-cli.js <file.lstar>');
  process.exit(0);
}

const fullPath = path.resolve(filePath);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ File not found: ${fullPath}`);
  process.exit(1);
}

const code = fs.readFileSync(fullPath, 'utf-8');
const app = new Littlestar();

app.run(code).catch(err => {
  console.error(`❌ Fatal System Error: ${err.message}`);
  process.exit(1);
});