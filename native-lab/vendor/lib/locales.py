"""LocalizeShots — App Store Connect locale catalog.

Each tuple: (short label, AppleLanguages code, AppleLocale code, ASC fl_dir,
             BCP-47 language tag, CLDR region code).

The last two columns are used by the testplan capture mode to populate
SIMULATOR_LANGUAGE and SIMULATOR_REGION environment variables in .xctestrun
plists.  They are not needed by the simctl mode and were added without
changing the column positions of the first four fields.

ASC's fl_dir naming differs from CLDR — `pt-BR` not `pt_BR`, `zh-Hans` not
`zh-CN`. Match exactly what `fastlane deliver` emits in `fastlane/metadata/`.
"""

from __future__ import annotations

LOCALES: list[tuple[str, str, str, str, str, str]] = [
    # short, AppleLanguages, AppleLocale,  ASC fl_dir,  BCP-47 lang, CLDR region
    ("en",       "en",       "en_US",      "en-US",     "en",        "US"),
    ("en-GB",    "en-GB",    "en_GB",      "en-GB",     "en-GB",     "GB"),
    ("en-AU",    "en-AU",    "en_AU",      "en-AU",     "en-AU",     "AU"),
    ("en-CA",    "en-CA",    "en_CA",      "en-CA",     "en-CA",     "CA"),
    ("ja",       "ja",       "ja_JP",      "ja",        "ja",        "JP"),
    ("fr-FR",    "fr",       "fr_FR",      "fr-FR",     "fr",        "FR"),
    ("fr-CA",    "fr-CA",    "fr_CA",      "fr-CA",     "fr-CA",     "CA"),
    ("de-DE",    "de",       "de_DE",      "de-DE",     "de",        "DE"),
    ("es-ES",    "es",       "es_ES",      "es-ES",     "es",        "ES"),
    ("es-MX",    "es-MX",    "es_MX",      "es-MX",     "es-MX",     "MX"),
    ("zh-Hans",  "zh-Hans",  "zh_Hans",    "zh-Hans",   "zh-Hans",   "CN"),
    ("zh-Hant",  "zh-Hant",  "zh_Hant",    "zh-Hant",   "zh-Hant",   "TW"),
    ("ko",       "ko",       "ko_KR",      "ko",        "ko",        "KR"),
    ("pt-BR",    "pt-BR",    "pt_BR",      "pt-BR",     "pt-BR",     "BR"),
    ("pt-PT",    "pt-PT",    "pt_PT",      "pt-PT",     "pt-PT",     "PT"),
    ("ru",       "ru",       "ru_RU",      "ru",        "ru",        "RU"),
    ("ar-SA",    "ar",       "ar_SA",      "ar-SA",     "ar",        "SA"),
    ("hi",       "hi",       "hi_IN",      "hi",        "hi",        "IN"),
    ("it",       "it",       "it_IT",      "it",        "it",        "IT"),
    ("nl-NL",    "nl",       "nl_NL",      "nl-NL",     "nl",        "NL"),
    ("sv",       "sv",       "sv_SE",      "sv",        "sv",        "SE"),
    ("no",       "no",       "no_NO",      "no",        "no",        "NO"),
    ("da",       "da",       "da_DK",      "da",        "da",        "DK"),
    ("fi",       "fi",       "fi_FI",      "fi",        "fi",        "FI"),
    ("pl",       "pl",       "pl_PL",      "pl",        "pl",        "PL"),
    ("tr",       "tr",       "tr_TR",      "tr",        "tr",        "TR"),
    ("th",       "th",       "th_TH",      "th",        "th",        "TH"),
    ("vi",       "vi",       "vi_VN",      "vi",        "vi",        "VN"),
    ("id",       "id",       "id_ID",      "id",        "id",        "ID"),
    ("ms",       "ms",       "ms_MY",      "ms",        "ms",        "MY"),
    ("he",       "he",       "he_IL",      "he",        "he",        "IL"),
    ("cs",       "cs",       "cs_CZ",      "cs",        "cs",        "CZ"),
    ("sk",       "sk",       "sk_SK",      "sk",        "sk",        "SK"),
    ("hu",       "hu",       "hu_HU",      "hu",        "hu",        "HU"),
    ("ro",       "ro",       "ro_RO",      "ro",        "ro",        "RO"),
    ("hr",       "hr",       "hr_HR",      "hr",        "hr",        "HR"),
    ("uk",       "uk",       "uk_UA",      "uk",        "uk",        "UA"),
    ("el",       "el",       "el_GR",      "el",        "el",        "GR"),
    ("ca",       "ca",       "ca_ES",      "ca",        "ca",        "ES"),
]


def matches(filter_set: set[str] | None, label: str, fl_dir: str) -> bool:
    """Accept internal labels, ASC fl_dirs, and unambiguous base-language aliases.

    A bare language such as ``fr`` selects the canonical regional row (``fr-FR``),
    not every regional variant. This keeps agent-facing locale requests ergonomic
    without silently dropping supported languages.
    """
    if not filter_set:
        return True
    if label in filter_set or fl_dir in filter_set:
        return True
    base = label.split("-", 1)[0]
    canonical = {"fr": "fr-FR", "de": "de-DE", "es": "es-ES"}
    return base in filter_set and canonical.get(base) == label
