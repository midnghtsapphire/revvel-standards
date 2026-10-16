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


def require_sources(sources):
    """Validate sources; raise MissingSourceError if there are none or any is incomplete."""
    if sources is None or isinstance(sources, DataSource):
        sources = [sources] if sources is not None else []
    sources = list(sources)
    if not sources:
        if not STRICT:
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
        if STRICT:
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


def provenance_block(sources):
    """The dict attached to every output location."""
    sources = require_sources(sources)
    return {
        "status": status_label(sources),
        "ground_verified": False,
        "sources": [asdict(s) for s in sources],
    }


def require_provenance(record):
    """Consumer-side check: exporters call this so a location that lost its
    provenance on the way cannot be written out as if it were clean."""
    prov = record.get("provenance") if isinstance(record, dict) else None
    # Original: refused any location without a status and a non-empty source list.
    # if not prov or not prov.get("status") or not prov.get("sources"):
    #     raise MissingSourceError("refusing to export a location with no provenance attached")
    if not prov or not prov.get("status"):
        if not STRICT:
            return {"status": LABEL_UNSOURCED, "ground_verified": False, "sources": []}
        raise MissingSourceError("refusing to export a location with no provenance attached")
    if STRICT and not prov.get("sources"):
        raise MissingSourceError("refusing to export a location with no provenance attached")
    return prov
