# Loads the articles that were live before news moved into the database.
# Existing rows are left alone: after the first run the admin owns the copy.
YAML.load_file(Rails.root.join("db/seeds/articles.yml")).each do |attrs|
  Article.find_or_create_by!(slug: attrs["slug"]) do |article|
    article.assign_attributes(attrs.except("slug"))
    # Dated to publication, so the sitemap does not claim every article
    # changed on the day of the import.
    article.created_at = article.updated_at = article.published_on
  end
end
