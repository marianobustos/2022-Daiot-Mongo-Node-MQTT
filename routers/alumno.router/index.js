const register = (router) => {
  router.get("/status", (req, resp) => resp.json({ status: 200 }));

  //listar leds de la db
  router.get("/leds", (req, resp) => resp.json({ status: 200 }));
  return router;
};

module.exports = {
  register,
};
