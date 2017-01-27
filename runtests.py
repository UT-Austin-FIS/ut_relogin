#!/usr/bin/env python
import pytest
import sys

PYTEST_ARGS = ['tests', '--tb=short', '-s', '-rw']


def exit_on_failure(ret, message=None):
    if ret:
        sys.exit(ret)

exit_on_failure(pytest.main(PYTEST_ARGS))
