from unittest.mock import MagicMock, patch

import httpx
import pytest

from gatekeeper_cli.api import DopplerAPI, GitHubAPI


@pytest.fixture
def github_api():
    return GitHubAPI(token="test-token")

@pytest.fixture
def doppler_api():
    return DopplerAPI(token="test-token")

def test_github_request_success(github_api):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"login": "testuser"}

    with patch.object(github_api.client, "request", return_value=mock_response) as mock_request:
        result = github_api._request("GET", "/user")

        assert result == {"login": "testuser"}
        mock_request.assert_called_once_with("GET", "https://api.github.com/user")

def test_github_request_204_no_content(github_api):
    mock_response = MagicMock()
    mock_response.status_code = 204

    with patch.object(github_api.client, "request", return_value=mock_response) as mock_request:
        result = github_api._request("DELETE", "/repos/owner/repo/actions/secrets/NAME")

        assert result == {}
        mock_request.assert_called_once_with("DELETE", "https://api.github.com/repos/owner/repo/actions/secrets/NAME")

def test_github_request_http_error(github_api):
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Unauthorized", request=MagicMock(), response=mock_response
    )

    with patch.object(github_api.client, "request", return_value=mock_response):
        with pytest.raises(httpx.HTTPStatusError):
            github_api._request("GET", "/user")

def test_github_health_check_success(github_api):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"login": "testuser"}

    with patch.object(github_api.client, "request", return_value=mock_response):
        result = github_api.health_check()

        assert result == {"status": "ok", "authenticated": True, "user": "testuser"}

def test_github_health_check_failure(github_api):
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Unauthorized", request=MagicMock(), response=mock_response
    )

    with patch.object(github_api.client, "request", return_value=mock_response):
        result = github_api.health_check()

        assert result["status"] == "error"
        assert result["authenticated"] is False
        assert "Unauthorized" in result["error"]

def test_doppler_request_success(doppler_api):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"projects": []}

    with patch.object(doppler_api.client, "request", return_value=mock_response) as mock_request:
        result = doppler_api._request("GET", "/projects")

        assert result == {"projects": []}
        mock_request.assert_called_once_with("GET", "https://api.doppler.com/v3/projects")

def test_doppler_health_check_success(doppler_api):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"name": "testuser"}

    with patch.object(doppler_api.client, "request", return_value=mock_response):
        result = doppler_api.health_check()

        assert result == {"status": "ok", "authenticated": True, "user": {"name": "testuser"}}

def test_doppler_health_check_failure(doppler_api):
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Unauthorized", request=MagicMock(), response=mock_response
    )

    with patch.object(doppler_api.client, "request", return_value=mock_response):
        result = doppler_api.health_check()

        assert result["status"] == "error"
        assert result["authenticated"] is False


def test_doppler_list_projects_success(doppler_api):
    with patch.object(doppler_api, "_request", return_value={"projects": [{"name": "proj1"}, {"name": "proj2"}]}) as mock_request:
        result = doppler_api.list_projects()

        assert result == [{"name": "proj1"}, {"name": "proj2"}]
def test_doppler_list_projects(doppler_api):
    mock_projects = [
        {"id": "project-1", "name": "Project 1"},
        {"id": "project-2", "name": "Project 2"}
    ]

    with patch.object(doppler_api, "_request", return_value={"projects": mock_projects}) as mock_request:
        result = doppler_api.list_projects()

        assert result == mock_projects
        mock_request.assert_called_once_with("GET", "/projects")

def test_doppler_list_projects_empty(doppler_api):
    with patch.object(doppler_api, "_request", return_value={}) as mock_request:
        result = doppler_api.list_projects()

        assert result == []
        mock_request.assert_called_once_with("GET", "/projects")
