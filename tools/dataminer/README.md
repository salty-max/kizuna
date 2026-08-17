# Rebuilding the datamined bundles

Everything needed to regenerate `data/raw/dataminer/ievr.{en,fr,ja}.json` after a game patch.
The extraction itself does not live in this repo — it needs the installed game and ~200 MB of
unpacked archives — but the parts that are ours do: the dataminer patch and the enrichment
steps.

## What is here

| | |
| --- | --- |
| `ievr_dataminer.patch` | our changes on top of [`Telmo26/ievr_dataminer`](https://github.com/Telmo26/ievr_dataminer) `37f224b`. Passives, tactics, equipment, teams, and name placeholder resolution. |
| `enrich.ps1` | driver for the steps the Rust does not do, with a check that no placeholder survived |
| `enrich/` | the steps themselves, one file each, in the order the driver runs them |

## The pipeline

```
ievr_toolbox dump   →  extracted/     game files, 2 archives out of 5863
ievr_dataminer      →  output/*.sqlite
merge_db            →  output/ievr.sqlite
export_json         →  output/json/ievr.{en,fr,ja}.json
enrich.ps1          →  the same files, completed in place
```

Then copy the three bundles into `data/raw/dataminer/`.

## Doing it

Rebuild the dataminer first — the release binary cannot produce any of this, see
[`../../data/raw/dataminer/HANDOFF.md`](../../data/raw/dataminer/HANDOFF.md).

```bash
git clone https://github.com/Telmo26/ievr_dataminer && cd ievr_dataminer
git checkout 37f224b && git am < path/to/ievr_dataminer.patch
cargo build --profile dist
```

`--profile dist` is not cosmetic: Smart App Control blocks the plain release binaries as
unsigned, and the dist profile produces one Windows accepts. If a step still dies with *An
Application Control policy has blocked this file*, point `-Bin` at a build it has already let
through.

```powershell
cd <extraction root>
.\ievr_dataminer.exe          # wipes and refills output/, so run it first
.\merge_db.exe   output
.\export_json.exe output
.\enrich.ps1 -Extract .\extracted -Output .\output -Bin .\bin
```

`enrich.ps1` ends by counting unresolved `<...>` placeholders in the three bundles and fails
if it finds any. `<VALUE>` is expected — it is the passive magnitude placeholder, documented in
the bundle README. Anything else means a step read a raw `.cfg.bin` instead of the resolved
database, which is exactly the bug that let `<FUL:KOMEI2>` reach the app.

## When the game updates

**Column indices are specific to build 6.00.23.00** and a patch will move them. The failure is
usually silent — an empty table rather than an error — because `main.rs` joins its threads with
`let _ = handle.join()`. So after any game update:

1. Run the pipeline and read the counts the dataminer prints. A section dropping to zero rows
   is the symptom.
2. Each module notes which column it reads and what pins it down; `show_table.exe` and
   `dump_schema.exe` are there to check a table by hand.
3. The invariant that survives patches: **every game id is the CRC32 of its string id**. It is
   what identifies a shifted column faster than anything else.

The name placeholder resolver is the one part that fails loudly on purpose — an unknown key
stops the process with the key and the line, rather than writing partial text.

## Still in PowerShell

The steps under `enrich/` read game configs the Rust side does not parse yet. They work and
they are checked, but they shell out to `show_table.exe` and parse its output, which is more
fragile than reading the tables directly. Folding them into the dataminer is the obvious next
move: each one reads a config that Rust already opens elsewhere, so it is mechanical rather
than exploratory work.
