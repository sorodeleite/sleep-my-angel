<div align="center">

<img src="assets/readme-photos/divider.png" width="100%" alt="divider" />

# sleep my angel

**meu cantinho de afirmações, meditações e rituais pra dormir em paz**

<img src="assets/readme-photos/start_readme.png" width="460" alt="sleep my angel" />

</div>

<br />

oi! esse é o **sleep my angel**, um app que eu fiz pra mim e que acabou virando meu lugar favorito antes de dormir.

a ideia é simples: juntar tudo que me acalma num lugar só — chuva e frequências geradas na hora, minhas meditações, o meu script da lei da suposição, livros e receitinhas da noite — sem anúncio, sem feed, sem barulho. ele roda no **celular (Android)**, no **computador (Electron)** e também no **navegador**.

<br />

<div align="center">
  <img src="assets/readme-photos/divider.png" width="100%" alt="divider" />
</div>

### o que tem aqui

- **library** no estilo spotify, em tons de cinza e pastel, com busca, filtros e playlists. já vem com a **corvo seco**, que junta todas as meditações.
- **meditações com nome e autor** — os arquivos seguem `nome_pessoa`, e o cartão mostra a meditação primeiro e a pessoa embaixo.
- **notion script** — importa a página do notion com **imagens, cores, colunas, callouts e subpáginas** dentro da mesma nota, do jeitinho que eu vejo lá. também aceita `.docx`, `.pdf`, texto colado e print.
- **estante** estilo kindle pra `.epub`, `.pdf` e `.txt`, com índice, progresso salvo, tema sépia/claro/escuro e troca de capa, nome e autor.
- **cookbook** com receitinhas da noite em cartões, ingredientes e passos que dá pra ir marcando.
- **afirmações da suposição** com leitura em voz alta pra ouvir deitada.
- **contador** de 15 min a 2 horas, com chuva suave, na janela ou forte tocando em loop e sumindo junto com o som.
- **áudio em segundo plano** no Android, com notificação e wake lock pra continuar tocando com a tela apagada.
- **atualizar app** — não precisa mais desinstalar pra atualizar: o botão no cartão do perfil baixa a versão nova e instala por cima, mantendo notas, playlists, capas e áudios importados.

<br />

### como instalar no celular

1. vai na aba de [**Releases**](https://github.com/sorodeleite/sleep-my-angel/releases).
2. baixa o `sleep-my-angel.apk`.
3. abre no celular e confirma a instalação (se pedir, autoriza "instalar de fontes desconhecidas").
4. pronto, o app aparece na sua tela inicial.

pra atualizar depois, é só tocar em **atualizar app** no cartão do perfil. ele procura a release nova, baixa e instala por cima — suas coisas continuam onde estão. se o Android pedir pra liberar a instalação, ativa "instalar apps desconhecidos" pro sleep my angel uma vez.

<br />

### como rodar no computador

precisa de **Node.js 22+**. pro APK, também de **JDK 21** e do Android SDK.

```bash
git clone https://github.com/sorodeleite/sleep-my-angel.git
cd "sleep my angel"
npm install
npm start
```

ou dá dois cliques em **`abrir-app.bat`**. pra abrir a versão web:

```bash
npm run web
```

ela sobe em `http://127.0.0.1:4173` e usa os áudios da pasta `audios/` quando eles existem.

<br />

### como gerar o APK

```bash
npm run cap:sync
cd android
./gradlew assembleRelease
```

no windows pode ser `gradlew.bat assembleRelease`. o apk assinado fica em `android/app/build/outputs/apk/release/app-release.apk`.

a chave fica em `android/keystore/` e é a mesma em todos os builds — é isso que faz a atualização instalar por cima sem perder os dados. o workflow de **Build Android APK** publica a release sozinho a cada push na `main`, usando a versão do `package.json` como tag.

<br />

### como exportar do notion

pra ficar igualzinho ao notion, o jeito certo é o **HTML**:

1. na página, clica em **⋯ → export**.
2. escolhe **HTML**.
3. liga **include subpages**.
4. baixa o `.zip`.
5. no app, toca em **＋ importar → escolher .zip do notion**.

as imagens são guardadas dentro da nota, e as subpáginas entram **dentro da mesma nota**, uma embaixo da outra. o **markdown & csv** também funciona e deixa o texto editável, mas perde as cores e as colunas.

<br />

### livros da estante

os `.epub`, capas e o `manifest.json` ficam em `assets/books/`. pra adicionar um livro novo, coloca o arquivo lá e roda:

```bash
node scripts/prepare-books.js
```

ele usa o **Calibre** pra converter `.azw3`, `.mobi` e `.prc`, tirar a capa e atualizar o manifest. também dá pra importar livro direto pelo botão **importar livro**.

<br />

### estrutura

```
audios/            minhas faixas locais (não vão pro git)
assets/            ícone, fotos, livros e imagens do readme
js/                módulos do app
js/notion.js       importação fiel do notion (html, markdown, subpáginas, imagens e pdf)
js/updater.js      botão de atualizar o app
js/vendor/         epub.js, JSZip, pdf.js e fflate pro leitor rodar offline
scripts/           build da versão web, servidor local e preparo dos livros
android/           projeto nativo em Capacitor
android/keystore/  chave que assina o APK
index.html         shell compartilhado entre desktop, android e web
main.js            processo principal do Electron
preload.js         ponte segura do Electron
```

<br />

### créditos das fotos

as fotos das receitas vêm de bancos livres e estão sob licenças Creative Commons:

- **leite quente** — [“A company to warm the heart...”](https://www.flickr.com/photo.gne?id=3655318767), Mira Pangkey, CC BY 2.0
- **moon milk** — [“Purple Sweet Potato Latte”](https://www.flickr.com/photo.gne?id=11834306445), Dushan and Miae, CC BY-SA 2.0
- **golden milk** — [“Turmeric Latte”](https://www.flickr.com/photo.gne?id=43134398655), ella.o, CC BY 2.0
- **chocolate noturno** — [rawpixel](https://www.rawpixel.com/), CC0
- **cappuccino do topo** — [“Cappuccino”](https://www.flickr.com/photo.gne?id=3016206629), DeaPeaJay, CC BY-SA 2.0

<br />

<div align="center">
  <img src="assets/readme-photos/divider.png" width="100%" alt="divider" />
  <br /><br />
  <img src="assets/readme-photos/end.webp" width="280" alt="end" />
  <br /><br />
  <sub>feito com carinho pra noites tranquilas ‧°✧</sub>
</div>
