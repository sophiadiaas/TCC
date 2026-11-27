let posts = [];
async function renderPosts() {
  try {
    posts = await Api.listar("posts");
    const u = Sessao.usuario();
    q("posts").innerHTML =
      posts
        .map(
          (p) =>
            `<article class="post"><div class="post-topo"><span class="avatar">${esc(iniciais(p.autor))}</span><b class="laranja">${esc(p.autor)}</b><small>${esc(new Date(p.data).toLocaleString("pt-BR"))}</small></div><p>${esc(p.texto)}</p><div class="post-acoes"><button class="link-btn ${p.curtido ? "curtido" : ""}" data-like="${p.id}" aria-label="${p.curtido ? "Descurtir" : "Curtir"} publicação de ${esc(p.autor)}">♥ ${p.curtidas}</button><button class="link-btn" data-comments="${p.id}">Comentários (${p.comentarios})</button>${u?.id === p.user_id ? `<button class="link-btn" data-edit="${p.id}">Editar</button><button class="link-btn" data-delete="${p.id}">Excluir</button>` : ""}</div><div id="comments-${p.id}"></div></article>`,
        )
        .join("") ||
      '<p class="state state-empty">A comunidade está começando. Faça a primeira publicação!</p>';
  } catch (error) {
    q("posts").innerHTML =
      `<p class="state state-error" role="alert">${esc(error.message)}</p>`;
    toast(error.message || "Não foi possível carregar as publicações.", "erro");
  }
}
async function comments(id) {
  const target = q("comments-" + id);
  target.innerHTML =
    '<p class="state state-loading">Carregando comentários...</p>';
  try {
    const data = await Api.request(`posts/${id}/comentarios`),
      u = Sessao.usuario();
    target.innerHTML =
      (data
        .map(
          (c) =>
            `<div class="match"><b>${esc(c.autor)}</b><p>${esc(c.text)}</p>${c.user_id === u?.id ? `<button class="link-btn" data-comment-edit="${c.id}" data-post="${id}">Editar comentário</button><button class="link-btn" data-comment-delete="${c.id}" data-post="${id}">Excluir comentário</button>` : ""}</div>`,
        )
        .join("") ||
        '<p class="state state-empty">Ainda não há comentários.</p>') +
      (u
        ? `<form data-comment-form="${id}"><label>Seu comentário<input name="texto" required maxlength="1000"></label><button class="btn">Comentar</button></form>`
        : "<p>Entre para comentar.</p>");
  } catch (error) {
    target.innerHTML = `<p class="state state-error" role="alert">${esc(error.message)}</p>`;
    toast(error.message || "Não foi possível carregar os comentários.", "erro");
    return;
  }
  target.querySelector("form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await Api.criar(`posts/${id}/comentarios`, {
      texto: e.target.elements.namedItem("texto").value,
    });
    await renderPosts();
    await comments(id);
  });
}
q("posts").onclick = async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.like) {
    const p = posts.find((x) => x.id == b.dataset.like);
    await Api.request(
      `posts/${p.id}/curtidas`,
      p.curtido ? "DELETE" : "POST",
      p.curtido ? undefined : {},
    );
    await renderPosts();
  }
  if (b.dataset.comments) await comments(b.dataset.comments);
  if (b.dataset.delete && confirmarExclusao()) {
    await Api.remover("posts", b.dataset.delete);
    await renderPosts();
  }
  if (b.dataset.edit) {
    const p = posts.find((x) => x.id == b.dataset.edit),
      t = prompt("Editar publicação", p.texto);
    if (t !== null) {
      await Api.atualizar("posts", p.id, { texto: t });
      await renderPosts();
    }
  }
  if (b.dataset.commentDelete && confirmarExclusao()) {
    await Api.remover("comentarios", b.dataset.commentDelete);
    await renderPosts();
    await comments(b.dataset.post);
  }
  if (b.dataset.commentEdit) {
    const c = await Api.request("comentarios/" + b.dataset.commentEdit),
      t = prompt("Editar comentário", c.text);
    if (t !== null) {
      await Api.atualizar("comentarios", c.id, { texto: t });
      await comments(b.dataset.post);
    }
  }
};
q("btn-publicar").onclick = () => {
  if (!Sessao.usuario()) return toast("Faça login para publicar.", "erro");
  q("nova").hidden = !q("nova").hidden;
  q("texto").focus();
};
q("form-post").onsubmit = async (e) => {
  e.preventDefault();
  await Api.criar("posts", { texto: q("texto").value });
  e.target.reset();
  q("nova").hidden = true;
  await renderPosts();
};
(async () => {
  await Sessao.ready;
  await renderPosts();
})();
