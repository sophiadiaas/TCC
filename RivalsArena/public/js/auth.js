for (const kind of ["login", "cadastro"]) {
  const form = q("form-" + kind);
  if (!form) continue;
  const feedback = q("auth-feedback");
  const fields = [...form.querySelectorAll("input:not([type=checkbox])")];
  fields.forEach((field) => {
    field.addEventListener("input", () => {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
      if (feedback) feedback.textContent = "";
    });
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target,
      button = f.querySelector('button[type="submit"]'),
      initialText = button.textContent;
    try {
      button.disabled = true;
      button.textContent =
        kind === "login" ? "Entrando..." : "Criando conta...";
      if (feedback) feedback.textContent = "";
      if (
        kind === "cadastro" &&
        f.elements.namedItem("senha").value !==
          f.elements.namedItem("confirmar").value
      ) {
        const password = f.elements.namedItem("senha");
        const confirmation = f.elements.namedItem("confirmar");
        password.setAttribute("aria-invalid", "true");
        confirmation.setAttribute("aria-invalid", "true");
        password.setAttribute("aria-describedby", "auth-feedback");
        confirmation.setAttribute("aria-describedby", "auth-feedback");
        feedback.textContent = "As senhas não coincidem.";
        confirmation.focus();
        return;
      }
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
      if (feedback)
        feedback.textContent =
          err.message || "Não foi possível concluir o acesso.";
    } finally {
      button.disabled = false;
      button.textContent = initialText;
    }
  });
}
