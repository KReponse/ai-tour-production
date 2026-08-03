import multer from "multer";
import path from "path";


/* STORAGE */

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(
      null,
      "src/uploads/"
    );

  },


  filename: (req, file, cb) => {

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(
        Math.random() * 1e9
      );


    cb(
      null,
      uniqueName +
      path.extname(
        file.originalname
      )
    );

  },

});


/* FILE FILTER */

const fileFilter = (req, file, cb) => {

  console.log(
    "UPLOAD FILE:",
    file.originalname,
    file.mimetype
  );

 const allowedTypes = [

"image/jpeg",
"image/png",
"image/jpg",
"image/webp",
"image/heic",
"image/heif",

"video/mp4",
"video/webm",
"video/quicktime"

];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}`
      ),
      false
    );
  }
};



/* MULTER */

const upload = multer({

  storage,

  fileFilter,

  limits: {

    fileSize:
      100 *
      1024 *
      1024,

  },

});



export default upload;