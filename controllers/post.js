// 이미지 업로드 후 이미지 경로 받아오기 
exports.afterUploadImage = (req, res) => {
  console.log(req.file); 
  res.json({ url: `/img/${req.file.filename}` });
};