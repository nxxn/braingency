class SitemapsController < ApplicationController
  # Built from Site::PAGES + Site::ARTICLES, so it can never drift out of sync
  # with the routes. URLs are composed from Site::HOST rather than the request,
  # so a sitemap fetched over the Heroku hostname still advertises the canonical
  # domain.
  #
  # Language alternates live only in each page's <head>: xhtml:link entries
  # here make browsers render the sitemap as an HTML page instead of a tree.
  def show
    @entries = Site::LOCALES.flat_map do |locale|
      pages = Site::PAGES.map do |page|
        { loc: absolute(path_for_page(page, locale)), priority: page.priority, changefreq: "monthly" }
      end

      articles = Site::ARTICLES.map do |article|
        { loc: absolute(article_path(slug: article.slug, locale: locale)),
          priority: 0.5, changefreq: "yearly", lastmod: article.published_on }
      end

      pages + articles
    end

    render formats: :xml
  end

  private

  def absolute(path) = "#{Site::HOST}#{path}"

  def path_for_page(page, locale)
    if page.root?
      locale_root_path(locale: locale)
    else
      public_send("#{page.key}_path", locale: locale)
    end
  end
end
