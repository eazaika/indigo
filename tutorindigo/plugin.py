import pkg_resources

from tutor import hooks

from .__about__ import __version__


################# Configuration
config = {
    # Add here your new settings
    "defaults": {
        "VERSION": __version__,
        "WELCOME_MESSAGE": "The place for all your online learning",
        "PRIMARY_COLOR": "#3b85ff",  # cool blue
        # Footer links are dictionaries with a "title" and "url"
        # To remove all links, run:
        # tutor config save --set INDIGO_FOOTER_NAV_LINKS=[] --set INDIGO_FOOTER_LEGAL_LINKS=[]
        "FOOTER_NAV_LINKS": [
            {"title": "About", "url": "/about"},
            {"title": "Contact", "url": "/contact"},
        ],
        "FOOTER_LEGAL_LINKS": [
            {"title": "Terms of service", "url": "/tos"},
            {
                "title": "Indigo theme for Open edX",
                "url": "https://github.com/overhangio/tutor-indigo",
            },
        ],
    },
    "unique": {},
    "overrides": {},
}

# Theme templates
hooks.Filters.ENV_TEMPLATE_ROOTS.add_item(
    pkg_resources.resource_filename("tutorindigo", "templates")
)
# This is where the theme is rendered in the openedx build directory
hooks.Filters.ENV_TEMPLATE_TARGETS.add_items(
    [
        ("indigo", "build/openedx/themes"),
    ],
)

# Force the rendering of scss files, even though they are included in a "partials" directory
# (Tutor skips underscore-prefixed files unless explicitly included.)
hooks.Filters.ENV_PATTERNS_INCLUDE.add_items(
    [
        r"indigo/lms/static/sass/partials/lms/theme/",
        r"indigo/lms/static/sass/profile/",
        r"indigo/lms/static/sass/account/",
        r"indigo/lms/static/sass/instructor/",
    ]
)

# Load all configuration entries
hooks.Filters.CONFIG_DEFAULTS.add_items(
    [(f"INDIGO_{key}", value) for key, value in config["defaults"].items()]
)
hooks.Filters.CONFIG_UNIQUE.add_items(
    [(f"INDIGO_{key}", value) for key, value in config["unique"].items()]
)
hooks.Filters.CONFIG_OVERRIDES.add_items(list(config["overrides"].items()))

# Course catalog: simple search (no facet sidebar). Must run after edx-settings plugin patches.
hooks.Filters.ENV_PATCHES.add_items(
    [
        (
            "openedx-common-settings",
            """
FEATURES["ENABLE_COURSE_DISCOVERY"] = True
# Расширенный поиск (фасеты) — раскомментировать для включения:
# COURSE_DISCOVERY_FILTERS = ["org", "language", "zet"]
COURSE_DISCOVERY_FILTERS = []
""",
        ),
        (
            "openedx-lms-development-settings",
            """
# Переопределяет plugins/edx-settings.yml (должно быть последним в development.py)
FEATURES["ENABLE_COURSE_DISCOVERY"] = True
COURSE_DISCOVERY_FILTERS = []
""",
        ),
        (
            "openedx-lms-production-settings",
            """
FEATURES["ENABLE_COURSE_DISCOVERY"] = True
COURSE_DISCOVERY_FILTERS = []
""",
        ),
    ]
)

_DISCOVERY_FACTORY = "lms/static/js/discovery/discovery_factory.js"
_THEME_DISCOVERY_FACTORY = f"/openedx/themes/indigo/{_DISCOVERY_FACTORY}"
_EDX_DISCOVERY_FACTORY = f"/openedx/edx-platform/{_DISCOVERY_FACTORY}"

hooks.Filters.ENV_PATCHES.add_items(
    [
        (
            "openedx-dockerfile",
            f"RUN cp {_THEME_DISCOVERY_FACTORY} {_EDX_DISCOVERY_FACTORY}\n",
        ),
        (
            "openedx-dev-dockerfile-post-python-requirements",
            f"RUN cp {_THEME_DISCOVERY_FACTORY} {_EDX_DISCOVERY_FACTORY}\n",
        ),
    ]
)
