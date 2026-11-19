for (const kind of ["login", "cadastro"]) {
  const form = q("form-" + kind);
  if (!form) continue;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target,
      button = f.querySelector("button");
    try {
      button.disabled = true;
      if (
        kind === "cadastro" &&
        f.elements.namedItem("senha").value !==
          f.elements.namedItem("confirmar").value
      )
        throw new Error("As senhas não coincidem.");
      const b =
        kind === "login"
          ? {
              login: f.elements.namedItem("login").value,
              senha: f.elements.namedItem("senha").value,
              lembrar: f.elements.namedItem("lembrar").checked,
            }
          : {
              usuario: f.elements.namedItem("usuario").value,
              email: f.elements.namedItem("email").value,
              senha: f.elements.namedItem("senha").value,
            };
      await Api.criar("auth/" + (kind === "login" ? "login" : "register"), b);
      location.href = "index.html";
    } catch (err) {
      toast(err.message, "erro");
    } finally {
      button.disabled = false;
    }
  });
}
