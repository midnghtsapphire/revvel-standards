"""revvel-rosette-automation source package.

Marker file so ``setuptools.find_packages(where='.', include=['src*'])`` (see
``pyproject.toml``) actually discovers this package and the ``[project.scripts]``
console entry points (``rosette``, ``rosette-scheduler``, ``rosette-gatekeeper``)
are wired up correctly when the project is installed via ``pip install -e .``.
"""
