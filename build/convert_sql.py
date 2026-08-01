#!/usr/bin/env python3
"""Konversi SQL dump hadits -> JSON statis untuk website Tauhidku.

Cara pakai (dari root project):
    py build/convert_sql.py            # konversi semua kitab
    py build/convert_sql.py --fast     # tes cepat: hanya 200 hadits per kitab
    py build/convert_sql.py --kitab shahih-bukhari   # hanya kitab tertentu

Hasil (folder tauhidku/data/):
    hadits/*.json   - satu file per kitab, format [id, arab, terjemah] (minified)
    manifest.json   - daftar kitab: file, nama tampilan, jumlah, ukuran
    daily.json      - 366 hadits harian (satu untuk tiap hari dalam setahun)
    random.json     - 1500 hadits untuk tombol "Hadits acak"
"""
import json
import os
import random
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "hadits-database-main")
DST = os.path.join(ROOT, "tauhidku", "data")
DST_KITAB = os.path.join(DST, "hadits")

# (file sql, file json, nama tampilan, jumlah hadits yang diharapkan)
KITABS = [
    ("shahih-bukhari.sql",       "shahih-bukhari.json",       "Shahih Bukhari",              7008),
    ("shahih-muslim.sql",        "shahih-muslim.json",        "Shahih Muslim",               5362),
    ("sunan-tirmidzi.sql",       "sunan-tirmidzi.json",       "Sunan Tirmidzi",              3891),
    ("sunan-abu-daud.sql",       "sunan-abu-daud.json",       "Sunan Abu Dawud",             4590),
    ("sunan-nasai.sql",          "sunan-nasai.json",          "Sunan Nasa'i",                5662),
    ("sunan-ibnu-majah.sql",     "sunan-ibnu-majah.json",     "Sunan Ibnu Majah",            4332),
    ("riyadhus-shalihin.sql",    "riyadhus-shalihin.json",    "Riyadhus Shalihin",            372),
    ("riyadhus-shalihin-arab.sql", "riyadhus-shalihin-arab.json", "Riyadhus Shalihin (Arab)",  850),
    ("muwatho_malik.sql",        "muwatho-malik.json",        "Muwaththa' Malik",            1594),
    ("musnad-syafii.sql",        "musnad-syafii.json",        "Musnad Syafi'i",              1800),
    ("musnad_darimi.sql",        "musnad-darimi.json",        "Musnad Darimi",               3367),
    ("musnad-ahmad.sql",         "musnad-ahmad.json",         "Musnad Ahmad",               26363),
]

FAST_LIMIT = 200  # dipakai saat --fast

# Escape MySQL: \\ -> \, \' -> ', \n -> baris baru, dst.
_ESCAPES = {"n": "\n", "r": "\r", "t": "\t", "0": "\0", "b": "\b", "Z": "\x1a"}
_ESC_RE = re.compile(r"\\(.)")


def _unescape(m):
    c = m.group(1)
    return _ESCAPES.get(c, c)


# Satu baris data: (123, 'kitab', 'arab', 'terjemah')
# String boleh berisi escape \' atau \\ (ditangani (?:[^'\\]|\\.)*)
_ROW_RE = re.compile(
    r"\((\d+),\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\)"
)


def parse_inserts(fh, table, limit=None):
    """Hasilkan baris (id, kitab, arab, terjemah) dari dump MySQL.

    Format phpMyAdmin: satu hadits = satu baris, diawali '(' dan diakhiri ','
    (baris terakhir ');'). Parsing per-baris jauh lebih cepat & aman daripada
    satu regex raksasa di atas file puluhan MB.
    """
    rows = []
    in_values = False
    for line in fh:
        if not in_values:
            if "INSERT INTO" in line and "`" + table + "`" in line and "VALUES" in line:
                in_values = True
            continue
        line = line.strip()
        if not line or line == ";":
            continue
        if line.startswith("("):
            m = _ROW_RE.match(line)
            if m:
                rows.append((
                    int(m.group(1)),
                    _ESC_RE.sub(_unescape, m.group(2)),
                    _ESC_RE.sub(_unescape, m.group(3)),
                    _ESC_RE.sub(_unescape, m.group(4)),
                ))
                if limit and len(rows) >= limit:
                    return rows
    return rows


def convert_one(sql_file, json_file, display, expected, fast=False, limit_file=None):
    path = os.path.join(SRC, sql_file)
    table = sql_file[:-4].replace("-", "_")
    out = []
    with open(path, encoding="utf-8-sig", errors="replace") as fh:
        for r in parse_inserts(fh, table, limit=FAST_LIMIT if fast else None):
            out.append([r[0], r[2] or "", r[3] or ""])  # [id, arab, terjemah]
    out.sort(key=lambda r: r[0])
    os.makedirs(DST_KITAB, exist_ok=True)
    dest = os.path.join(DST_KITAB, json_file)
    with open(dest, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    ok = "" if fast or limit_file else ("  %s" % ("OK" if len(out) == expected else "!! SELISIH"))
    print("  %-28s %6d hadits  (%6.1f MB)%s" % (display, len(out), os.path.getsize(dest) / 1e6, ok))
    return out, json_file


def main():
    fast = "--fast" in sys.argv
    limit_file = None
    if "--kitab" in sys.argv:
        limit_file = sys.argv[sys.argv.index("--kitab") + 1]

    print("Konversi SQL -> JSON (fast=%s, hanya-kitab=%s)" % (fast, limit_file or "semua"))
    start = time.time()

    all_rows = []        # (index kitab, id, arab, terjemah)
    manifest_kitab = []
    total = 0
    for i, (sql_file, json_file, display, expected) in enumerate(KITABS):
        key = json_file.replace(".json", "")
        if limit_file and key not in limit_file:
            continue
        rows, _ = convert_one(sql_file, json_file, display, expected, fast, limit_file)
        size = os.path.getsize(os.path.join(DST_KITAB, json_file))
        manifest_kitab.append({"file": json_file, "name": display, "count": len(rows), "size": size})
        if not fast:
            for r in rows:
                all_rows.append((i, r[0], r[1], r[2]))
        total += len(rows)

    # ---- manifest.json ----
    manifest = {
        "generated": time.strftime("%Y-%m-%d"),
        "total": total,
        "kitab": manifest_kitab,
    }
    with open(os.path.join(DST, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)

    # ---- daily.json & random.json (hanya saat build penuh) ----
    if not fast and all_rows:
        rng = random.Random(1337)
        rng.shuffle(all_rows)
        # daily: 366 hadits, satu untuk tiap hari dalam setahun
        daily = [[day, KITABS[k][1], hid, arab, terjemah]
                 for day, (k, hid, arab, terjemah) in enumerate(all_rows[:366], start=1)]
        with open(os.path.join(DST, "daily.json"), "w", encoding="utf-8") as fh:
            json.dump(daily, fh, ensure_ascii=False, separators=(",", ":"))
        # random: 1500 hadits untuk tombol "Hadits acak"
        rnd = [[KITABS[k][1], hid, arab, terjemah]
               for k, hid, arab, terjemah in all_rows[366:366 + 1500]]
        with open(os.path.join(DST, "random.json"), "w", encoding="utf-8") as fh:
            json.dump(rnd, fh, ensure_ascii=False, separators=(",", ":"))
        print("  daily.json: %d hadits, random.json: %d hadits" % (len(daily), len(rnd)))

    print("Selesai dalam %.1f detik. Total: %d hadits." % (time.time() - start, total))


if __name__ == "__main__":
    main()
