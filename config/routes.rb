Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # Language-agnostic permalink. EIC evaluators are given this URL directly and
  # it must keep resolving regardless of what happens to the locale scheme.
  get "/gender-equality-plan", to: redirect("/en/gender-equality-plan", status: 302), as: :gep_permalink

  get "/sitemap.xml", to: "sitemaps#show", as: :sitemap, defaults: { format: "xml" }

  # Internal comparison sheet for choosing the logo mark. Never exposed in
  # production, never linked from the site.
  get "/dev/brand", to: "pages#brand" if Rails.env.development?

  scope "/:locale", locale: /#{Site::LOCALES.join("|")}/ do
    root to: "pages#home", as: :locale_root

    Site::PAGES.reject(&:root?).each do |page|
      get page.slug, to: "pages##{page.action}", as: page.key
    end

    get "news/:slug", to: "pages#article", as: :article
  end

  # "/" sniffs Accept-Language and forwards to /en or /lv
  root to: "pages#locale_redirect"
end
