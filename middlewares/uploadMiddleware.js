const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const stream = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'product_variants',  // Cloudinary folder for the images
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"], // Allowed image formats
    transformation: [{ width: 500, height: 500, crop: 'limit' }]  // Optional: Resize images
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size 5MB
  timeout: 600000 // Set timeout to 10 minutes (600000 ms)
});

// Comprehensive list of supported image file types
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
];

const localStorage = multer.memoryStorage();
const uploadLocal = multer({
  storage: localStorage,
  fileFilter: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
      ".tiff",
      ".tif",
    ];

    if (
      SUPPORTED_IMAGE_TYPES.includes(file.mimetype) &&
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed types: ${allowedExtensions.join(", ")}`), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Increased to 10MB
    files: 4, // Max 4 files
  },
});

const uploadMiddleware = async (req, res, next) => {
  try {
    // Handle the file uploads using uploadLocal
    uploadLocal.array("imageFiles")(req, res, async (multerErr) => {
      if (multerErr) {
        console.error("Multer Upload Error:", {
          message: multerErr.message,
          name: multerErr.name,
          stack: multerErr.stack,
        });
        return res.status(400).json({ error: "File upload error", details: multerErr.message });
      }

      if (!req.files || req.files.length === 0) {
        req.body.imageUrls='';
        return next();
      }

      console.log("Uploaded Files Details:", req.files.map(file => ({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        encoding: file.encoding,
      })));

      try {
        // Cloudinary upload with comprehensive error handling
        const uploadPromises = req.files.map((file) => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "product_variants",
                allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"],
                resource_type: "image",
                transformation: [{ quality: "auto:best" }, { fetch_format: "auto" }],
              },
              (error, result) => {
                if (error) {
                  console.error("Cloudinary Upload Error:", {
                    message: error.message,
                    error: error,
                    file: file.originalname,
                  });
                  reject({
                    message: error.message,
                    stack: error.stack,
                  });
                } else {
                  console.log("Cloudinary Upload Success:", { url: result.secure_url, filename: file.originalname });
                  resolve(result.secure_url);
                }
              }
            );

            // Convert buffer to stream
            const bufferStream = stream.Readable.from(file.buffer);
            bufferStream.pipe(uploadStream);
          });
        });

        // Wait for all uploads to finish
        const imageUrls = await Promise.all(uploadPromises);

        // Attach URLs to request body
        req.body.imageUrls = imageUrls;

        // Proceed to the next middleware
        next();
      } catch (cloudinaryError) {
        console.error("Comprehensive Cloudinary Error:", {
          message: cloudinaryError.message,
          stack: cloudinaryError.stack,
        });
        return res.status(500).json({ error: "Error uploading to cloud storage", details: cloudinaryError.message });
      }
    });
  } catch (generalError) {
    console.error("General Middleware Error:", {
      message: generalError.message,
      stack: generalError.stack,
    });
    return res.status(500).json({ error: "Server error during upload", details: generalError.message });
  }
};

// Function to validate Cloudinary configuration
function validateCloudinaryConfig() {
  const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("Missing Cloudinary Configuration:", missingVars);
    throw new Error(`Missing Cloudinary configuration: ${missingVars.join(", ")}`);
  }
}

// Validate config on module load
validateCloudinaryConfig();

module.exports = { uploadMiddleware };
