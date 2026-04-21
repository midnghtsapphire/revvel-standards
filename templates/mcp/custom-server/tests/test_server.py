from mcp_server.server import get_status

def test_get_status():
    """Test that the get_status tool returns the expected operational status."""
    result = get_status()

    assert isinstance(result, dict)
    assert result.get("status") == "operational"
    assert result.get("service") == "[APP_NAME]"
    assert result.get("version") == "1.0.0"
