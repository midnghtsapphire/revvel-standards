import pytest
from pathlib import Path
from coldtrace.backend.services.viewshed import compute_viewshed

@pytest.mark.asyncio
async def test_compute_viewshed_demo_mode(mocker):
    # Mock settings.demo_mode to True
    mocker.patch("coldtrace.backend.services.viewshed.settings.demo_mode", True)

    # Call the function
    result = await compute_viewshed(
        dem_path="fake/path",
        observer_lon=0.0,
        observer_lat=0.0
    )

    # Assertions
    assert result["type"] == "FeatureCollection"
    assert len(result["features"]) == 1
    assert result["features"][0]["properties"]["source"] == "demo"
    assert result["features"][0]["geometry"]["type"] == "Polygon"

    # Verify it's NOT calling the production path
    mock_run = mocker.patch("coldtrace.backend.services.viewshed._run_whitebox_viewshed")
    await compute_viewshed(dem_path="fake/path", observer_lon=0.0, observer_lat=0.0)
    mock_run.assert_not_called()

@pytest.mark.asyncio
async def test_compute_viewshed_production_path(mocker):
    # Mock settings.demo_mode to False
    mocker.patch("coldtrace.backend.services.viewshed.settings.demo_mode", False)

    # Mock _run_whitebox_viewshed to avoid actual execution
    mock_run = mocker.patch("coldtrace.backend.services.viewshed._run_whitebox_viewshed")
    mock_run.return_value = {"type": "FeatureCollection", "features": []}

    # Call the function
    dem_str = "fake/path"
    result = await compute_viewshed(
        dem_path=dem_str,
        observer_lon=1.0,
        observer_lat=2.0,
        observer_height=2.0,
        max_distance=100.0
    )

    # Assertions
    assert result == {"type": "FeatureCollection", "features": []}
    mock_run.assert_called_once_with(
        dem_path=Path(dem_str),
        observer_lon=1.0,
        observer_lat=2.0,
        observer_height=2.0,
        max_distance=100.0
    )

@pytest.mark.asyncio
async def test_compute_viewshed_demo_mode_isolation(mocker):
    """Verify that demo mode is correctly isolated even if production path fails."""
    mocker.patch("coldtrace.backend.services.viewshed.settings.demo_mode", True)

    # Even if production path would fail (e.g. missing imports), demo mode should work
    mocker.patch("coldtrace.backend.services.viewshed._run_whitebox_viewshed", side_effect=RuntimeError("Production failed"))
    result = await compute_viewshed(dem_path="fake", observer_lon=0, observer_lat=0)
    assert result["features"][0]["properties"]["source"] == "demo"
