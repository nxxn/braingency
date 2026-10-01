module ApplicationHelper
  # --- SEO ----------------------------------------------------------------

  def page_title
    t("meta.#{@page_key}.title", default: Site::BRAND)
  end

  def page_description
    t("meta.#{@page_key}.description", default: t("meta.home.description"))
  end

  # Same route, other locale — used for the switcher and for hreflang.
  def alternate_url(locale)
    url_for(locale: locale, only_path: false, host: canonical_host)
  rescue ActionController::UrlGenerationError
    "#{canonical_host}/#{locale}"
  end

  def canonical_url = alternate_url(I18n.locale)

  def canonical_host
    Rails.env.production? ? Site::HOST : request.base_url
  end

  # Cards are pre-rendered by bin/build-brand into public/og/. They live outside
  # the asset pipeline on purpose: scrapers cache by URL, and a content digest
  # that changes on every deploy would invalidate every previously shared link.
  def og_image_url
    name = ["og/#{@page_key}.#{I18n.locale}.png", "og/#{@page_key}.png", "og/default.png"].find do |path|
      Rails.public_path.join(path).exist?
    end
    return nil unless name

    "#{canonical_host}/#{name}"
  end

  # --- Navigation ---------------------------------------------------------

  def nav_link_to(page)
    active = @page_key == page.key
    link_to t("nav.#{page.key}"),
            public_send("#{page.key}_path"),
            class: class_names("nav-link", "is-active" => active),
            aria: { current: ("page" if active) }
  end

  def path_for(page_key)
    page_key.to_sym == :home ? locale_root_path : public_send("#{page_key}_path")
  end

  # --- Content helpers ----------------------------------------------------

  # Renders a locale key that holds an array of paragraphs.
  def paragraphs(key, **options)
    Array(t(key, default: [], **options)).map { |p| tag.p(p) }.join.html_safe
  end

  # Served straight out of public/ rather than the asset pipeline: EIC
  # evaluators are given this URL in an application form, so it must stay
  # byte-identical across deploys instead of picking up a new content digest.
  def gep_document_path = "/documents/#{Site::GEP[:filename]}"

  def gep_document_url = "#{Site::HOST}#{gep_document_path}"

  # Whole euros in the reader's convention — "€14,900" / "14 900 €" — matching
  # what Intl.NumberFormat produces in the browser, so server-rendered sample
  # figures and the ones the illustrations generate never disagree.
  def euros(amount, compact: false)
    lv = I18n.locale == :lv
    if compact
      millions = (amount / 1_000_000.0).round(1).to_s
      return lv ? "#{millions.tr(".", ",")} milj. €" : "€#{millions}M"
    end
    digits = number_with_delimiter(amount.round, delimiter: lv ? "\u00a0" : ",")
    lv ? "#{digits}\u00a0€" : "€#{digits}"
  end

  def format_date(date)
    l(date, format: :long)
  end

  # --- Structured data ----------------------------------------------------

  # Every JSON-LD block for the current page: the organisation everywhere,
  # the site entity on the home page, breadcrumbs below it, and an Article on
  # news pages. Rendered by the layout as one <script> each.
  def structured_data
    blocks = [organization_data]
    blocks << website_data if @page_key == :home
    blocks << breadcrumb_data unless @page_key == :home
    blocks << article_data if @article
    blocks.compact
  end

  def json_ld(data) = data.to_json.html_safe

  private

  def website_data
    {
      "@context" => "https://schema.org",
      "@type" => "WebSite",
      "@id" => "#{Site::HOST}/#website",
      "name" => Site::BRAND,
      "url" => Site::HOST,
      "inLanguage" => Site::LOCALES.map(&:to_s),
      "publisher" => { "@id" => "#{Site::HOST}/#organization" }
    }
  end

  # Home › Page, or Home › News › Article.
  def breadcrumb_data
    trail = [[t("nav.home"), locale_root_url(host: canonical_host)]]
    if @article
      trail << [t("nav.news"), news_url(host: canonical_host)]
      trail << [t("articles.#{@article.slug.tr("-", "_")}.title"), canonical_url]
    elsif Site.page(@page_key.to_s)
      trail << [t("nav.#{@page_key}"), canonical_url]
    else
      return nil
    end

    {
      "@context" => "https://schema.org",
      "@type" => "BreadcrumbList",
      "itemListElement" => trail.each_with_index.map do |(name, url), i|
        { "@type" => "ListItem", "position" => i + 1, "name" => name, "item" => url }
      end
    }
  end

  def article_data
    key = @article.slug.tr("-", "_")
    {
      "@context" => "https://schema.org",
      "@type" => "BlogPosting",
      "headline" => t("articles.#{key}.title"),
      "description" => t("articles.#{key}.excerpt"),
      "datePublished" => @article.published_on.iso8601,
      "dateModified" => @article.published_on.iso8601,
      "inLanguage" => I18n.locale.to_s,
      "mainEntityOfPage" => canonical_url,
      "image" => og_image_url,
      "author" => { "@id" => "#{Site::HOST}/#organization" },
      "publisher" => { "@id" => "#{Site::HOST}/#organization" }
    }.compact
  end

  def organization_data
    {
      "@context" => "https://schema.org",
      "@type" => "Organization",
      "@id" => "#{Site::HOST}/#organization",
      "name" => Site::BRAND,
      "legalName" => Site::LEGAL_NAME,
      "url" => Site::HOST,
      # A stable, digest-free URL, for the same reason as the OG cards.
      "logo" => "#{Site::HOST}/icon-512.png",
      "sameAs" => Site::PROFILES,
      "email" => Site::CONTACT_EMAIL,
      "description" => t("meta.home.description"),
      "taxID" => Site::VAT_NUMBER,
      "vatID" => Site::VAT_NUMBER,
      "identifier" => Site::REG_NUMBER,
      "address" => {
        "@type" => "PostalAddress",
        "streetAddress" => Site::ADDRESS[:street],
        "addressLocality" => Site::ADDRESS[:locality],
        "postalCode" => Site::ADDRESS[:postal_code],
        "addressCountry" => Site::ADDRESS[:country]
      },
      "founder" => Site::FOUNDERS.map do |f|
        {
          "@type" => "Person",
          "name" => f[:name],
          "jobTitle" => t("pages.team.roles.#{f[:role_key]}"),
          "sameAs" => f[:linkedin]
        }
      end,
      "knowsAbout" => [
        "Machine learning", "Credit scoring", "Lending systems",
        "ERP", "CRM", "Ruby on Rails", "Fintech"
      ]
    }
  end
end
