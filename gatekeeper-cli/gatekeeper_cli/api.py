"""API clients for Doppler and GitHub."""

import base64
from typing import Any

import httpx
from rich.console import Console

console = Console()


class DopplerAPI:
    """Doppler API client."""

    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.doppler.com/v3"
        self.client = httpx.Client(
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        )

    def _request(self, method: str, endpoint: str, **kwargs) -> dict[str, Any]:
        """Make HTTP request to Doppler API."""
        url = f"{self.base_url}{endpoint}"
        response = self.client.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    def list_projects(self) -> list[dict[str, Any]]:
        """List all projects."""
        data = self._request("GET", "/projects")
        return data.get("projects", [])

    def list_configs(self, project: str) -> list[dict[str, Any]]:
        """List configs in a project."""
        data = self._request("GET", f"/projects/{project}/configs")
        return data.get("configs", [])

    def list_secrets(self, project: str, config: str) -> list[dict[str, Any]]:
        """List secrets in a config."""
        data = self._request("GET", f"/projects/{project}/configs/{config}/secrets")
        return data.get("secrets", [])

    def get_secret(self, name: str, project: str, config: str) -> dict[str, Any]:
        """Get a specific secret."""
        data = self._request("GET", f"/projects/{project}/configs/{config}/secrets/{name}")
        return data

    def set_secret(self, name: str, value: str, project: str, config: str) -> dict[str, Any]:
        """Set or update a secret."""
        payload = {"name": name, "value": value}
        data = self._request("POST", f"/projects/{project}/configs/{config}/secrets", json=payload)
        return data

    def delete_secret(self, name: str, project: str, config: str) -> dict[str, Any]:
        """Delete a secret."""
        params = {"project": project, "config": config, "name": name}
        data = self._request("DELETE", "/configs/config/secret", params=params)
        return data

    def create_service_token(
        self, name: str, project: str, config: str, access: str = "read"
    ) -> dict[str, Any]:
        """Create a service token."""
        payload = {"name": name, "config": f"{project}_{config}", "access": access}
        data = self._request("POST", "/configs/config/tokens", json=payload)
        return data

    def list_service_tokens(self, project: str, config: str) -> list[dict[str, Any]]:
        """List service tokens."""
        params = {"project": project, "config": config}
        data = self._request("GET", "/configs/config/tokens", params=params)
        return data.get("tokens", [])

    def revoke_service_token(self, token: str, project: str, config: str) -> dict[str, Any]:
        """Revoke a service token."""
        params = {"project": project, "config": config, "token": token}
        data = self._request("DELETE", "/configs/config/tokens/token", params=params)
        return data

    def health_check(self) -> dict[str, Any]:
        """Check API health and authentication."""
        try:
            data = self._request("GET", "/me")
            return {"status": "ok", "authenticated": True, "user": data}
        except Exception as e:
            return {"status": "error", "authenticated": False, "error": str(e)}


class GitHubAPI:
    """GitHub API client."""

    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.github.com"
        self.client = httpx.Client(
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )

    def _request(self, method: str, endpoint: str, **kwargs) -> Any:
        """Make HTTP request to GitHub API."""
        url = f"{self.base_url}{endpoint}"
        response = self.client.request(method, url, **kwargs)
        response.raise_for_status()
        if response.status_code == 204:
            return {}
        return response.json()

    def list_repo_secrets(self, owner: str, repo: str) -> list[dict[str, Any]]:
        """List repository secrets."""
        data = self._request("GET", f"/repos/{owner}/{repo}/actions/secrets")
        return data.get("secrets", [])

    def get_repo_public_key(self, owner: str, repo: str) -> dict[str, str]:
        """Get repository public key for encrypting secrets."""
        return self._request("GET", f"/repos/{owner}/{repo}/actions/secrets/public-key")

    def set_repo_secret(
        self, owner: str, repo: str, secret_name: str, secret_value: str
    ) -> dict[str, Any]:
        """Set a repository secret."""
        # Get public key
        key_data = self.get_repo_public_key(owner, repo)
        key_id = key_data["key_id"]
        public_key = key_data["key"]

        # Encrypt secret value
        from nacl import encoding, public

        public_key_obj = public.PublicKey(public_key.encode("utf-8"), encoding.Base64Encoder())
        sealed_box = public.SealedBox(public_key_obj)
        encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
        encrypted_value = base64.b64encode(encrypted).decode("utf-8")

        # Set secret
        payload = {"encrypted_value": encrypted_value, "key_id": key_id}
        return self._request(
            "PUT", f"/repos/{owner}/{repo}/actions/secrets/{secret_name}", json=payload
        )

    def delete_repo_secret(self, owner: str, repo: str, secret_name: str) -> dict[str, Any]:
        """Delete a repository secret."""
        return self._request("DELETE", f"/repos/{owner}/{repo}/actions/secrets/{secret_name}")

    def health_check(self) -> dict[str, Any]:
        """Check API health and authentication."""
        try:
            data = self._request("GET", "/user")
            return {"status": "ok", "authenticated": True, "user": data.get("login")}
        except Exception as e:
            return {"status": "error", "authenticated": False, "error": str(e)}
