export default defineEventHandler(async (e) => {
  // if the request hits this point, it's because it passed the payment middleware
  // return protected content

  return {
    message:
      "The Ultimate Answer to Life, the Universe, and Everything has been calculated",
    result: 42,
  };
});
