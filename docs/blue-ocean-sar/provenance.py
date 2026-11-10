"""Where did this number come from? Refuse to output a location without an answer.

Every tool in this folder that turns inputs into a map location must be told
what its inputs are. A location built on nothing, on a guess, or on synthetic
test data must say so on the output itself, in a way that survives copying
into a GeoJSON file, an ATAK marker or a report.

Kinds of source:
  measured       data you have as a file: a SAR scene, a LiDAR tile, a GPS log.
                 Needs a reference (file path, URL, product/scene ID).
  public_record  a news report, police bulletin, court or property record.
                 Needs a reference (URL or document ID).
  estimate       an assumption or a modelled value (soil density, walking speed).
  synthetic      made-up test data. Locations from it are not real.

Every output is labelled UNVERIFIED: none of these tools can confirm what is on
the ground. Only a ground search can.
"""

from dataclasses import asdict, dataclass

SOURCE_KINDS = ("measured", "public_record", "estimate", "synthetic")
NEEDS_REFERENCE = ("measured", "public_record")

LABEL_SYNTHETIC = "SYNTHETIC DEMO - NOT A REAL LOCATION"
LABEL_ESTIMATE = "UNVERIFIED - BUILT PARTLY ON ESTIMATES, NOT MEASUREMENTS"
LABEL_MEASURED = "UNVERIFIED CANDIDATE - FROM MEASURED DATA, NOT CONFIRMED ON THE GROUND"
LABEL_UNSOURCED = "UNSOURCED - NO INPUT SOURCE NAMED"

# Off by default (owner's decision): tools run and label their output instead
# of refusing. Set provenance.STRICT = True for the refuse-to-run behaviour.
STRICT = False

# Export paths (GeoJSON, CoT, KML) are strict regardless of STRICT: a location
# that leaves this folder as a file or an ATAK marker must name checkable
# sources. Demos opt out per call with allow_unverified=True (CLI: --demo).
# See SYSTEM_REVIEW H1.
EXPORT_STRICT = True


class MissingSourceError(ValueError):
    """Raised instead of producing a location from unnamed inputs."""


@dataclass(frozen=True)
class DataSource:
    description: str
    kind: str
    reference: str = ""

    def validate(self):
        if not self.description or not self.description.strip():
            raise MissingSourceError("data source has no description")
        if self.kind not in SOURCE_KINDS:
            raise MissingSourceError(f"source kind {self.kind!r} is not one of {SOURCE_KINDS}")
        if self.kind in NEEDS_REFERENCE and not self.reference.strip():
            raise MissingSourceError(
                f"{self.kind} source {self.description!r} needs a reference (file path, URL or ID) "
                "so someone else can check it"
            )


def _resolve_strict(strict):
    """strict=None means "use the module-wide STRICT setting"."""
    return STRICT if strict is None else bool(strict)


def require_sources(sources, strict=None):
    """Validate sources; raise MissingSourceError if there are none or any is incomplete.

    strict: None follows provenance.STRICT; True/False overrides it for this call."""
    strict = _resolve_strict(strict)
    if sources is None or isinstance(sources, DataSource):
        sources = [sources] if sources is not None else []
    sources = list(sources)
    if not sources:
        # What was wrong: one global STRICT switch, off by default, governed both inputs and exports, so
        # unsourced locations reached files and ATAK. Lesson: exports need their own strict path (H1).
        # if not STRICT:
        if not strict:
            return []
        raise MissingSourceError(
            "refusing to produce a location: no input data source was named. "
            "Pass sources=[DataSource(...)] describing what the input data is."
        )
    for s in sources:
        if not isinstance(s, DataSource):
            raise MissingSourceError(f"expected DataSource, got {type(s).__name__}")
        # Original: every source was always validated (refused without a reference).
        # s.validate()
        # if STRICT:  # now the per-call setting (H1)
        if strict:
            s.validate()
        elif s.kind not in SOURCE_KINDS:
            # A mistyped kind would otherwise be labelled as measured data.
            raise MissingSourceError(f"source kind {s.kind!r} is not one of {SOURCE_KINDS}")
    return sources


def status_label(sources):
    if not sources:
        return LABEL_UNSOURCED
    kinds = {s.kind for s in sources}
    if "synthetic" in kinds:
        return LABEL_SYNTHETIC
    if "estimate" in kinds:
        return LABEL_ESTIMATE
    return LABEL_MEASURED


def provenance_block(sources, strict=None):
    """The dict attached to every output location.

    strict: None follows provenance.STRICT; True refuses missing or incomplete sources."""
    # sources = require_sources(sources)  # now the per-call setting (H1)
    sources = require_sources(sources, strict=strict)
    return {
        "status": status_label(sources),
        "ground_verified": False,
        "sources": [asdict(s) for s in sources],
    }


def require_provenance(record, strict=None):
    """Consumer-side check so a location that lost its provenance on the way
    cannot be written out as if it were clean.

    strict: None follows provenance.STRICT. Exporters should call
    require_export_provenance() instead, which is strict by default."""
    strict = _resolve_strict(strict)
    prov = record.get("provenance") if isinstance(record, dict) else None
    # Original: refused any location without a status and a non-empty source list.
    # if not prov or not prov.get("status") or not prov.get("sources"):
    #     raise MissingSourceError("refusing to export a location with no provenance attached")
    if not prov or not prov.get("status"):
        # if not STRICT:  # now the per-call setting (H1)
        if not strict:
            return {"status": LABEL_UNSOURCED, "ground_verified": False, "sources": []}
        raise MissingSourceError("refusing to export a location with no provenance attached")
    # A block with only some keys, or a status that is not one of the labels,
    # used to pass in default mode; exporters then crashed on the missing keys
    # or wrote the unchecked status out.
    problem = _provenance_problem(prov)
    if problem:
        # if not STRICT:  # now the per-call setting (H1)
        if not strict:
            return {"status": LABEL_UNSOURCED, "ground_verified": False, "sources": []}
        raise MissingSourceError(f"refusing to export a location with malformed provenance: {problem}")
    # if STRICT and not prov.get("sources"):  # now the per-call setting (H1)
    if strict and not prov.get("sources"):
        raise MissingSourceError("refusing to export a location with no provenance attached")
    # The shape check above accepts a blank description or a measured source
    # with no reference, which DataSource.validate() refuses on the way in.
    # if STRICT:  # now the per-call setting (H1)
    if strict:
        for src in prov["sources"]:
            problem = _strict_source_problem(src)
            if problem:
                raise MissingSourceError(f"refusing to export a location with an incomplete source: {problem}")
    return prov


def require_export_provenance(record, allow_unverified=False):
    """require_provenance() for export paths (GeoJSON, CoT, KML).

    Strict unless allow_unverified=True: refuses a location with missing,
    malformed or unsourced provenance, and a measured or public_record source
    without a reference. allow_unverified=True (CLI --demo) falls back to
    provenance.STRICT, which by default labels such a location UNSOURCED."""
    strict = None if allow_unverified else EXPORT_STRICT
    return require_provenance(record, strict=strict)


def _strict_source_problem(src):
    """What DataSource.validate() would refuse in this exported source dict, or None."""
    if not src["description"].strip():
        return "a source has a blank description"
    if src["kind"] in NEEDS_REFERENCE:
        ref = src.get("reference")
        if not isinstance(ref, str) or not ref.strip():
            return f"{src['kind']} source {src['description']!r} has no reference (file path, URL or ID)"
    return None


STATUS_LABELS = (LABEL_SYNTHETIC, LABEL_ESTIMATE, LABEL_MEASURED, LABEL_UNSOURCED)


def _provenance_problem(prov):
    """Why a provenance block is not the shape provenance_block() makes, or None."""
    if not isinstance(prov, dict):
        return "not a dict"
    if prov.get("status") not in STATUS_LABELS:
        return f"status {prov.get('status')!r} is not one of the standard labels"
    if not isinstance(prov.get("ground_verified"), bool):
        return "ground_verified is missing or not a boolean"
    sources = prov.get("sources")
    if not isinstance(sources, list):
        return "sources is missing or not a list"
    for src in sources:
        if not isinstance(src, dict) or not isinstance(src.get("description"), str) \
                or src.get("kind") not in SOURCE_KINDS:
            return f"source {src!r} has no description or an unknown kind"
    return None
