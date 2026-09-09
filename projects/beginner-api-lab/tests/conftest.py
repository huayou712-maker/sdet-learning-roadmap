import pytest
import requests
from lab_server import FAULTS, registration_server


def pytest_addoption(parser):
    parser.addoption("--lab-fault", choices=FAULTS, default="none",
                     help="Synthetic fault for checking test sensitivity; never a production setting")


@pytest.fixture
def base_url(request):
    # Function scope: every test gets a new server/store. No reset API or real data.
    with registration_server(request.config.getoption("--lab-fault")) as url:
        yield url


@pytest.fixture
def api():
    with requests.Session() as session:
        session.trust_env = False  # Local lab traffic must not go through a proxy.
        yield session
