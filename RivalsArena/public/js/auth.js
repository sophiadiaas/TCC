for (const kind of ["login", "cadastro"]) {
  const form = q("form-" + kind);
  if (!form) continue;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target,
      button = f.querySelector("button"),
      feedback = q("auth-feedback");
    try {
      button.disabled = true;
      if (feedback) feedback.textContent = "";
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
      if (feedback) feedback.textContent = err.message;
      toast(err.message, "erro");
    } finally {
      button.disabled = false;
    }
  });
}
