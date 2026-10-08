module Admin
  class ArticlesController < BaseController
    before_action :set_article, only: %i[edit update destroy]

    def index
      @articles = Article.newest_first
    end

    def new
      @article = Article.new(published_on: Date.current)
    end

    def create
      @article = Article.new(article_params)
      if @article.save
        redirect_to admin_articles_path, notice: "Article created."
      else
        render :new, status: :unprocessable_entity
      end
    end

    def edit; end

    def update
      if @article.update(article_params)
        redirect_to admin_articles_path, notice: "Article saved."
      else
        render :edit, status: :unprocessable_entity
      end
    end

    def destroy
      @article.destroy!
      redirect_to admin_articles_path, notice: "Article deleted."
    end

    private

    def set_article
      @article = Article.find(params[:id])
    end

    def article_params
      localized = %i[title excerpt body meta_title meta_description].product(Site::LOCALES).map { |f, l| :"#{f}_#{l}" }
      params.require(:article).permit(:slug, :published_on, :published, :template, *localized)
    end
  end
end
