import os
import pytest
import requests

BASE_URL = "https://ce575c72-9c35-4df0-aa04-7bff24f34586.preview.emergentagent.com"


@pytest.fixture
def base_url():
    return BASE_URL


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
