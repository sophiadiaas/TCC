let posts = [];

async function renderPosts() {
  const stopLoading = startLoading(q("posts"), "Carregando publicações...");
  q("posts").setAttribute("aria-busy", "true");
  try {
    posts = await Api.listar("posts");
    const user = Sessao.usuario();
    q("posts").innerHTML = posts
      .map(
        (post) =>
          `<article class="post"><div class="post-topo"><span class="avatar" aria-hidden="true">${esc(iniciais(post.autor))}</span><b class="laranja">${esc(post.autor)}</b><small>${esc(new Date(post.data).toLocaleString("pt-BR"))}</small></div><p>${esc(post.texto)}</p><div class="post-acoes"><button class="link-btn ${post.curtido ? "curtido" : ""}" data-like="${post.id}" aria-pressed="${Boolean(post.curtido)}" aria-label="${post.curtido ? "Descurtir" : "Curtir"} publicação de ${esc(post.autor)}">Curtir · ${post.curtidas}</button><button class="link-btn" data-comments="${post.id}" aria-expanded="false" aria-controls="comments-${post.id}">Comentários (${post.comentarios})</button>${user?.id === post.user_id ? `<button class="link-btn" data-edit="${post.id}">Editar</button><button class="link-btn post-delete" data-delete="${post.id}">Excluir</button>` : ""}</div><div id="comments-${post.id}"></div></article>`,
      )
      .join("");
    if (!posts.length)
      renderState(
        q("posts"),
        "empty",
        "Ainda não há publicações. Seja a primeira pessoa a compartilhar algo.",
      );
  } catch (error) {
    renderState(
      q("posts"),
      "error",
      error.message || "Não foi possível carregar as publicações.",
      "Tentar novamente",
      renderPosts,
    );
  } finally {
    stopLoading();
    q("posts").setAttribute("aria-busy", "false");
  }
}

async function comments(id) {
  const target = q("comments-" + id);
  const stopLoading = startLoading(target, "Carregando comentários...");
  try {
    const data = await Api.request(`posts/${id}/comentarios`);
    const user = Sessao.usuario();
    q("posts")
      .querySelector(`[data-comments="${id}"]`)
      ?.setAttribute("aria-expanded", "true");
    target.replaceChildren();
    if (data.length) {
      target.insertAdjacentHTML(
        "beforeend",
        data
          .map(
            (comment) =>
              `<div class="match"><b>${esc(comment.autor)}</b><p>${esc(comment.text)}</p>${comment.user_id === user?.id ? `<button class="link-btn" data-comment-edit="${comment.id}" data-post="${id}">Editar comentário</button><button class="link-btn post-delete" data-comment-delete="${comment.id}" data-post="${id}">Excluir comentário</button>` : ""}</div>`,
          )
          .join(""),
      );
    } else {
      renderState(target, "empty", "Ainda não há comentários.");
    }

    if (user) {
      target.insertAdjacentHTML(
        "beforeend",
        `<form data-comment-form="${id}"><label for="comment-text-${id}">Seu comentário<input id="comment-text-${id}" name="texto" required maxlength="1000"></label><button class="btn" type="submit">Comentar</button></form>`,
      );
    } else {
      target.insertAdjacentHTML(
        "beforeend",
        '<p class="comment-signin">Entre para comentar.</p>',
      );
    }
  } catch (error) {
    renderState(
      target,
      "error",
      error.message || "Não foi possível carregar os comentários.",
      "Tentar novamente",
      () => comments(id),
    );
    return;
  } finally {
    stopLoading();
  }

  target.querySelector("form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = event.target.elements.namedItem("texto");
    try {
      await Api.criar(`posts/${id}/comentarios`, { texto: input.value });
      await renderPosts();
      await comments(id);
    } catch (error) {
      renderState(
        target,
        "error",
        error.message || "Não foi possível enviar o comentário.",
        "Tentar novamente",
        () => comments(id),
      );
    }
  });
}

function atualizarContador() {
  const input = q("texto");
  const length = input.value.length;
  q("contador-texto").textContent = `${length} / 1000`;
  q("submit-post").disabled = !input.value.trim();
}

q("posts").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.like) {
    if (!Sessao.usuario())
      return toast("Entre para curtir publicações.", "erro");
    const post = posts.find((item) => item.id == button.dataset.like);
    await Api.request(
      `posts/${post.id}/curtidas`,
      post.curtido ? "DELETE" : "POST",
      post.curtido ? undefined : {},
    );
    await renderPosts();
  }
  if (button.dataset.comments) {
    const target = q("comments-" + button.dataset.comments);
    if (button.getAttribute("aria-expanded") === "true") {
      button.setAttribute("aria-expanded", "false");
      target.replaceChildren();
    } else {
      button.setAttribute("aria-expanded", "true");
      await comments(button.dataset.comments);
    }
  }
  if (button.dataset.delete && confirmarExclusao()) {
    await Api.remover("posts", button.dataset.delete);
    await renderPosts();
  }
  if (button.dataset.edit) {
    const post = posts.find((item) => item.id == button.dataset.edit);
    const text = prompt("Editar publicação", post.texto);
    if (text !== null) {
      await Api.atualizar("posts", post.id, { texto: text });
      await renderPosts();
    }
  }
  if (button.dataset.commentDelete && confirmarExclusao()) {
    await Api.remover("comentarios", button.dataset.commentDelete);
    await renderPosts();
    await comments(button.dataset.post);
  }
  if (button.dataset.commentEdit) {
    const comment = await Api.request(
      "comentarios/" + button.dataset.commentEdit,
    );
    const text = prompt("Editar comentário", comment.text);
    if (text !== null) {
      await Api.atualizar("comentarios", comment.id, { texto: text });
      await comments(button.dataset.post);
    }
  }
});

q("btn-publicar").addEventListener("click", () => q("texto").focus());
q("texto").addEventListener("input", atualizarContador);
q("form-post").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = q("submit-post");
  const feedback = q("post-feedback");
  feedback.hidden = true;
  button.disabled = true;
  try {
    await Api.criar("posts", { texto: q("texto").value });
    event.target.reset();
    atualizarContador();
    toast("Publicação enviada.", "sucesso");
    await renderPosts();
  } catch (error) {
    feedback.textContent = error.message || "Não foi possível publicar.";
    feedback.hidden = false;
    toast(feedback.textContent, "erro");
  } finally {
    atualizarContador();
  }
});

(async () => {
  const stopSessionLoading = startLoading(
    q("posts"),
    "Verificando sua sessão...",
  );
  try {
    q("posts").setAttribute("aria-busy", "true");
    await Sessao.ready;
    if (Sessao.usuario()) {
      q("nova").hidden = false;
      q("btn-publicar").hidden = false;
    } else if (Sessao._status === "unavailable") {
      q("publicacao-visitante").hidden = false;
      renderState(
        q("publicacao-visitante"),
        "error",
        "Não foi possível verificar sua sessão.",
        "Tentar novamente",
        () => location.reload(),
      );
    } else {
      q("publicacao-visitante").hidden = false;
    }
  } finally {
    stopSessionLoading();
  }
  await renderPosts();
})();
