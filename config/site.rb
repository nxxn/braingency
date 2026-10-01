# Single source of truth for the site's structure and legal facts.
#
# Navigation, the sitemap, hreflang alternates and the JSON-LD block are all
# derived from here, so adding a page means touching this file and the two
# locale files — nothing else.
module Site
  LOCALES = %i[en lv].freeze
  DEFAULT_LOCALE = :en

  HOST = "https://braingency.eu".freeze

  # Active logo mark. Candidates: :aperture, :node, :core.
  # Compare them side by side at /dev/brand (development only).
  MARK = :core

  # --- Company ------------------------------------------------------------

  BRAND        = "Braingency".freeze
  LEGAL_NAME   = "SIA BATWATEX".freeze
  REG_NUMBER   = "40203303150".freeze
  VAT_NUMBER   = "LV40203303150".freeze
  FOUNDED_YEAR = 2020

  ADDRESS = {
    street:      "Rupniecibas 22-38",
    locality:    "Riga",
    postal_code: "LV-1010",
    country:     "LV",
    country_name: "Latvia"
  }.freeze

  CONTACT_EMAIL = "contact@braingency.eu".freeze

  # Company profiles, listed as sameAs in the Organization JSON-LD so search
  # engines tie the site to them.
  PROFILES = ["https://www.linkedin.com/company/braingencyeu"].freeze

  # --- People -------------------------------------------------------------

  FOUNDERS = [
    {
      key: :shehurina,
      # Spelling matches the signed Gender Equality Plan, which EIC evaluators
      # cross-check against the site.
      name: "Misela Sehurina",
      role_key: :ceo,
      linkedin: "https://www.linkedin.com/in/shehurina",
      initials: "MS"
    },
    {
      key: :gnotovs,
      name: "Nikita Gnotovs",
      role_key: :cto,
      linkedin: "https://www.linkedin.com/in/gnotov",
      initials: "NG"
    }
  ].freeze

  # --- Gender Equality Plan (published for EIC / Horizon Europe) -----------

  GEP = {
    version:      "1.0",
    adopted_on:   Date.new(2026, 1, 12),
    review_years: 2,
    filename:     "braingency-gender-equality-plan-v1.0-2026-01-12.pdf"
  }.freeze

  # --- Pages --------------------------------------------------------------

  Page = Struct.new(:key, :slug, :action, :in_nav, :priority, keyword_init: true) do
    def root? = slug.nil?
  end

  PAGES = [
    Page.new(key: :home,                 slug: nil,                     action: :home,                 in_nav: false, priority: 1.0),
    Page.new(key: :product,              slug: "product",               action: :product,              in_nav: true,  priority: 0.9),
    Page.new(key: :ml_lab,               slug: "ml-lab",                action: :ml_lab,               in_nav: true,  priority: 0.9),
    Page.new(key: :about,                slug: "about",                 action: :about,                in_nav: true,  priority: 0.8),
    Page.new(key: :team,                 slug: "team",                  action: :team,                 in_nav: true,  priority: 0.8),
    Page.new(key: :news,                 slug: "news",                  action: :news,                 in_nav: true,  priority: 0.7),
    Page.new(key: :contact,              slug: "contact",               action: :contact,              in_nav: true,  priority: 0.7),
    Page.new(key: :gender_equality_plan, slug: "gender-equality-plan",  action: :gender_equality_plan, in_nav: false, priority: 0.6)
  ].freeze

  NAV_PAGES = PAGES.select(&:in_nav).freeze

  def self.page(key) = PAGES.find { |p| p.key == key.to_sym }

  # --- News ---------------------------------------------------------------
  #
  # Dates live here rather than in the locale files: they are language
  # independent and must not drift between EN and LV.
  Article = Struct.new(:slug, :published_on, keyword_init: true)

  ARTICLES = [
    Article.new(slug: "keeping-scoring-models-honest",  published_on: Date.new(2026, 9, 24)),
    Article.new(slug: "verteo-live-in-latvia",          published_on: Date.new(2026, 9, 10)),
    Article.new(slug: "one-platform-not-five-tools",    published_on: Date.new(2026, 8, 12)),
    Article.new(slug: "verteo-property-valuation-ml",   published_on: Date.new(2026, 7, 29))
  ].freeze

  # Slugs that have been live and were later renamed. Old URLs answer with a
  # permanent redirect so links and search engines carry over.
  RENAMED_ARTICLES = {
    "vertio-live-in-latvia"        => "verteo-live-in-latvia",
    "vertio-property-valuation-ml" => "verteo-property-valuation-ml"
  }.freeze

  def self.article(slug) = ARTICLES.find { |a| a.slug == slug }
end
