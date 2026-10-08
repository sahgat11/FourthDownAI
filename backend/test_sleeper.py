import sys

from sleeper_client import (
    print_user_leagues,
)


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: "
            "python backend/test_sleeper.py "
            "<sleeper_username>"
        )

        return

    username = sys.argv[1]

    print_user_leagues(
        username,
        season=2026
    )


if __name__ == "__main__":
    main()