import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

@service({
  title: "Portfolio Service API",
  version: "1.0.0"
})
namespace PortfolioService;

using TypeSpec.Http;
using TypeSpec.Rest;

@doc("Portfolio visibility enumeration")
enum PortfolioVisibility {
  public: "public",
  private: "private", 
  unlisted: "unlisted"
}

@doc("Gallery type enumeration")
enum GalleryType {
  client_gallery: "client_gallery",
  portfolio_showcase: "portfolio_showcase",
  featured_work: "featured_work"
}

@doc("Portfolio model")
model Portfolio {
  @key
  @doc("Unique portfolio identifier")
  id: string;
  
  @doc("Portfolio owner (photographer) user ID")
  photographerId: string;
  
  @doc("Portfolio title")
  @minLength(1)
  @maxLength(200)
  title: string;
  
  @doc("Portfolio description")
  @maxLength(2000)
  description?: string;
  
  @doc("Portfolio visibility")
  visibility: PortfolioVisibility;
  
  @doc("Custom portfolio URL slug")
  @pattern("^[a-z0-9-]+$")
  @minLength(3)
  @maxLength(50)
  urlSlug: string;
  
  @doc("Portfolio cover image URL")
  coverImageUrl?: string;
  
  @doc("Portfolio is featured")
  isFeatured: boolean = false;
  
  @doc("Display order")
  displayOrder: int32 = 0;
  
  @doc("Portfolio metadata")
  metadata?: Record<string>;
  
  ...Timestamps
}

@doc("Gallery model")
model Gallery {
  @key
  @doc("Unique gallery identifier")
  id: string;
  
  @doc("Associated portfolio ID")
  portfolioId: string;
  
  @doc("Associated shoot ID (for client galleries)")
  shootId?: string;
  
  @doc("Gallery type")
  type: GalleryType;
  
  @doc("Gallery title")
  @minLength(1)
  @maxLength(200)
  title: string;
  
  @doc("Gallery description")
  @maxLength(1000)
  description?: string;
  
  @doc("Gallery cover image URL")
  coverImageUrl?: string;
  
  @doc("Gallery display order within portfolio")
  displayOrder: int32 = 0;
  
  @doc("Gallery is published")
  isPublished: boolean = false;
  
  @doc("Custom gallery password (for private galleries)")
  password?: string;
  
  @doc("Gallery expiration date")
  expiresAt?: utcDateTime;
  
  @doc("Allow downloads")
  allowDownloads: boolean = true;
  
  @doc("Gallery metadata")
  metadata?: Record<string>;
  
  ...Timestamps
}

@doc("Gallery image model")
model GalleryImage {
  @key
  @doc("Unique gallery image identifier")
  id: string;
  
  @doc("Associated gallery ID")
  galleryId: string;
  
  @doc("Associated file ID from file service")
  fileId: string;
  
  @doc("Image display order within gallery")
  displayOrder: int32 = 0;
  
  @doc("Image title/caption")
  @maxLength(500)
  caption?: string;
  
  @doc("Image is featured in gallery")
  isFeatured: boolean = false;
  
  @doc("Image metadata")
  metadata?: Record<string>;
  
  ...Timestamps
}

@doc("Create portfolio request")
model CreatePortfolioRequest {
  @doc("Portfolio title")
  @minLength(1)
  @maxLength(200)
  title: string;
  
  @doc("Portfolio description")
  @maxLength(2000)
  description?: string;
  
  @doc("Portfolio visibility")
  visibility: PortfolioVisibility;
  
  @doc("Custom portfolio URL slug")
  @pattern("^[a-z0-9-]+$")
  @minLength(3)
  @maxLength(50)
  urlSlug: string;
  
  @doc("Portfolio cover image URL")
  coverImageUrl?: string;
}

@doc("Update portfolio request")
model UpdatePortfolioRequest {
  @doc("Portfolio title")
  @minLength(1)
  @maxLength(200)
  title?: string;
  
  @doc("Portfolio description")
  @maxLength(2000)
  description?: string;
  
  @doc("Portfolio visibility")
  visibility?: PortfolioVisibility;
  
  @doc("Custom portfolio URL slug")
  @pattern("^[a-z0-9-]+$")
  @minLength(3)
  @maxLength(50)
  urlSlug?: string;
  
  @doc("Portfolio cover image URL")
  coverImageUrl?: string;
  
  @doc("Portfolio is featured")
  isFeatured?: boolean;
  
  @doc("Display order")
  displayOrder?: int32;
}

@doc("Create gallery request")
model CreateGalleryRequest {
  @doc("Associated portfolio ID")
  portfolioId: string;
  
  @doc("Associated shoot ID (for client galleries)")
  shootId?: string;
  
  @doc("Gallery type")
  type: GalleryType;
  
  @doc("Gallery title")
  @minLength(1)
  @maxLength(200)
  title: string;
  
  @doc("Gallery description")
  @maxLength(1000)
  description?: string;
  
  @doc("Gallery cover image URL")
  coverImageUrl?: string;
  
  @doc("Custom gallery password")
  password?: string;
  
  @doc("Gallery expiration date")
  expiresAt?: utcDateTime;
  
  @doc("Allow downloads")
  allowDownloads?: boolean;
}

@doc("Add images to gallery request")
model AddGalleryImagesRequest {
  @doc("Array of file IDs to add")
  fileIds: string[];
  
  @doc("Starting display order")
  startOrder?: int32;
}

@doc("Portfolio query parameters")
model PortfolioQuery {
  @doc("Filter by photographer ID")
  @query
  photographerId?: string;
  
  @doc("Filter by visibility")
  @query
  visibility?: PortfolioVisibility;
  
  @doc("Filter by featured status")
  @query
  isFeatured?: boolean;
  
  ...PaginationQuery
}

@doc("Gallery query parameters")  
model GalleryQuery {
  @doc("Filter by portfolio ID")
  @query
  portfolioId?: string;
  
  @doc("Filter by shoot ID")
  @query
  shootId?: string;
  
  @doc("Filter by type")
  @query
  type?: GalleryType;
  
  @doc("Filter by published status")
  @query
  isPublished?: boolean;
  
  ...PaginationQuery
}

@route("/portfolios")
interface PortfolioOperations {
  @post
  @doc("Create a new portfolio")
  createPortfolio(@body portfolio: CreatePortfolioRequest): SuccessResponse<Portfolio> | ApiError;
  
  @get
  @doc("List portfolios with optional filtering")
  listPortfolios(...PortfolioQuery): PaginatedResponse<Portfolio> | ApiError;
  
  @get
  @doc("Get portfolio by ID")
  getPortfolio(@path portfolioId: string): SuccessResponse<Portfolio> | ApiError;
  
  @get
  @route("/slug/{urlSlug}")
  @doc("Get portfolio by URL slug")
  getPortfolioBySlug(@path urlSlug: string): SuccessResponse<Portfolio> | ApiError;
  
  @patch
  @doc("Update portfolio")
  updatePortfolio(@path portfolioId: string, @body update: UpdatePortfolioRequest): SuccessResponse<Portfolio> | ApiError;
  
  @delete
  @doc("Delete portfolio")
  deletePortfolio(@path portfolioId: string): SuccessResponse<{deleted: boolean}> | ApiError;
}

@route("/galleries")
interface GalleryOperations {
  @post
  @doc("Create a new gallery")
  createGallery(@body gallery: CreateGalleryRequest): SuccessResponse<Gallery> | ApiError;
  
  @get
  @doc("List galleries with optional filtering")
  listGalleries(...GalleryQuery): PaginatedResponse<Gallery> | ApiError;
  
  @get
  @doc("Get gallery by ID")
  getGallery(@path galleryId: string): SuccessResponse<Gallery> | ApiError;
  
  @patch
  @doc("Update gallery")
  updateGallery(@path galleryId: string, @body update: CreateGalleryRequest): SuccessResponse<Gallery> | ApiError;
  
  @post
  @route("/{galleryId}/images")
  @doc("Add images to gallery")
  addImagesToGallery(@path galleryId: string, @body request: AddGalleryImagesRequest): SuccessResponse<GalleryImage[]> | ApiError;
  
  @get
  @route("/{galleryId}/images")
  @doc("Get gallery images")
  getGalleryImages(@path galleryId: string): SuccessResponse<GalleryImage[]> | ApiError;
  
  @delete
  @doc("Delete gallery")
  deleteGallery(@path galleryId: string): SuccessResponse<{deleted: boolean}> | ApiError;
}