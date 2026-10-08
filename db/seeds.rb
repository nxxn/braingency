# Loads the articles that were live before news moved into the database, plus
# later additions shipped with the code. A new slug is created in full; on an
# existing row only blank fields are filled (e.g. a newly added language), so
# whatever was edited in the admin stays as it is.
YAML.load_file(Rails.root.join("db/seeds/articles.yml")).each do |attrs|
  article = Article.find_or_initialize_by(slug: attrs["slug"])
  attrs = attrs.except("slug")

  if article.new_record?
    article.assign_attributes(attrs)
    # Dated to publication, so the sitemap does not claim every article
    # changed on the day of the import.
    article.created_at = article.updated_at = article.published_on
  else
    article.assign_attributes(attrs.select { |field, _| article[field].blank? })
  end

  article.save! if article.changed?
end
