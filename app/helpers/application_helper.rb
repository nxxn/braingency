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
    name = ["og/#{@page_key}.png", "og/default.png"].find do |path|
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

  def format_date(date)
    l(date, format: :long)
  end

  # --- Structured data ----------------------------------------------------

  def organization_json_ld
    {
      "@context" => "https://schema.org",
      "@type" => "Organization",
      "@id" => "#{Site::HOST}/#organization",
      "name" => Site::BRAND,
      "legalName" => Site::LEGAL_NAME,
      "url" => Site::HOST,
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
    }.to_json.html_safe
  end
end
