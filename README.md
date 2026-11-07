<div align="center">

<img src="assets/readme-photos/divider.png" width="100%" alt="divider" />

# sleep my angel

**meu aplicativo de afirmações da lei da suposição e rituais da noite**

<img src="assets/readme-photos/start_readme.png" width="460" alt="sleep my angel vibe" />

</div>

<br />

esse é um projeto que eu já estava rascunhando há um tempo e finalmente resolvi estruturar certinho pra me ajudar a dormir em paz. quem tem insônia ou a cabeça cheia antes de deitar sabe como é difícil desacelerar, então quis criar um app bem bonitinho e confortável só meu pra ter tudo que preciso em um lugar só.

a ideia central do **sleep my angel** é juntar sons de chuva e ruídos relaxantes gerados na hora, além de meditações funcionando em segundo plano no celular ou computador, sem anúncios ou interrupções chatas, com um cantinho dedicado à lei da suposição (principalmente inspirada nas palestras e visões do Edward Art e Neville Goddard).

o app roda como **APK nativo para Android** (com projeto Capacitor e Gradle), como aplicativo de desktop em Electron e também tem uma **versão web** pra abrir no navegador.

<br />

<div align="center">
  <img src="assets/readme-photos/divider.png" width="100%" alt="divider" />
</div>

### o que tem no app

- **library estilo spotify (clean & cinza)**: grade com estética suave em tons de cinza e pastéis para navegar pelas meditações e frequências sonoras (ondas theta, pink noise e ruídos suaves). dá pra criar playlists por cor, escolher os sons de cada uma e buscar qualquer faixa. já vem com a playlist **corvo seco**, que junta todas as meditações que estão no app.
- **áudio em 2º plano no android**: serviço em primeiro plano com notificação e wake lock para o som continuar tocando quando você apagar a tela ou trocar de app.
- **sons gerados na hora**: quando um arquivo de áudio não está no aparelho, o app cria pink noise, brown noise ou theta wave pelo Web Audio pra faixa não ficar em silêncio.
- **atualização pelo próprio app**: no android aparece um botão **atualizar app** no cartão do perfil. ele procura a versão nova no github, baixa o apk e instala **por cima**, sem desinstalar e sem perder notas, playlists, capas ou áudios importados.
- **cantinho da lei da suposição & edward art**: cartões de afirmações e lembretes de que a imaginação é a única realidade. conta também com leitura em voz alta em português pra ouvir deitada antes de adormecer com a sensação do desejo já consumado.
- **cookbook em grade com fotos**: receitas em cartões com fotos recortadas, busca e filtros. dá pra marcar ingredientes e passos (o item risca), editar, restaurar ou apagar, e adicionar a sua com foto própria.
- **meditações com nome e autor**: os arquivos seguem o padrão `nome_pessoa`, e a biblioteca mostra o nome da meditação primeiro e o nome da pessoa embaixo, no estilo Spotify.
- **estante estilo kindle**: leitor de `.epub`, `.pdf` e `.txt` com temas (sépia, claro e escuro), tamanho de letra, índice, progresso salvo, troca de capa e agora também troca de nome e autor de qualquer livro. os livros que já vêm em `assets/books` aparecem com capa, e dá pra importar outros por arquivo.
- **threads do twitter sem distração**: cola o link de um post/thread, o app puxa o texto e guarda na estante pra ler offline, sem feed e sem anúncio.
- **notion script offline com imagens**: a exportação do **Notion** (Markdown & CSV `.zip`, `.md` + pasta de imagens, `.html`) é importada com o layout do próprio Notion dentro do app: títulos, listas, checklists, tabelas, citações, callouts, código e **as fotos que vêm no zip**. as imagens são convertidas e ficam guardadas offline dentro da nota, inclusive as de links externos quando o Notion permite. também aceita `.docx` (com as imagens de dentro dele) e `.pdf` do **Google Drive**, dá pra arrastar os arquivos pra dentro da nota e tem um botão **＋ imagem** pra colar um print direto na nota. o botão **＋ importar** fica no topo da página e abre um painel explicando qual export escolher.
- **áudios editáveis**: cada cartão da library aceita troca de capa, troca de nome e troca do arquivo de áudio. quando você importa um áudio com o mesmo nome de uma meditação, ele se conecta automaticamente ao cartão em vez de duplicar.
- **capas padrão**: as meditações usam `assets/images/default_meditacao.jpg`; você pode trocar a capa de qualquer uma individualmente.
- **contador com chuva em loop**: além do timer programável (15m, 30m, 45m, 1h, 1h30, 2h) que reduz o volume nos últimos sessenta segundos, agora dá pra escolher uma chuva suave, na janela ou forte. ela toca em loop até o contador acabar e some junto com o resto do som.
- **estética retro mello**: janelinha com jeitinho de sistema antigo, perfil fofo, pílulas suaves e controles delicados.

<br />

<div align="center">
  <img src="assets/readme-photos/web-preview.png" width="900" alt="versão web do sleep my angel" />
</div>

<br />

<div align="center">
  <img src="assets/readme-photos/divider.png" width="100%" alt="divider" />
</div>

### como baixar e instalar o APK no celular

1. vá na aba de [**Releases**](https://github.com/sorodeleite/sleep-my-angel/releases) deste repositório.
2. baixe o arquivo `sleep-my-angel.apk`.
3. abra o arquivo no seu celular Android e confirme a instalação (se pedir, autorize a instalação de fontes desconhecidas).
4. prontinho! o app vai aparecer na sua tela inicial.
5. **pra atualizar depois:** não precisa desinstalar nada. dentro do app, no cartão do perfil, toque em **atualizar app** (ou no aviso “nova versão”). ele baixa a versão nova e instala por cima — suas notas, playlists, capas e áudios importados ficam guardados.

> se você instalou uma versão antiga que foi gerada antes da assinatura fixa, pode ser preciso desinstalar **uma única vez** pra trocar a assinatura. depois dessa, todas as atualizações seguintes instalam por cima.

<br />

### como rodar pelo computador

precisa de **Node.js 22 ou mais novo**. pro APK, também de **JDK 21** e do Android SDK.

1. baixe ou clone o repositório:
```bash
git clone https://github.com/sorodeleite/sleep-my-angel.git
cd "sleep my angel"
```
2. instale as dependências:
```bash
npm install
```
3. rode o app de desktop:
```bash
npm start
```
ou dê dois cliques em **`abrir-app.bat`**. é esse modo que abre a janela com os três botões coloridos no canto (fechar, minimizar e maximizar), iguais aos do macOS. eles são desenhados pelo próprio app em Electron, não são do Windows.
4. pra abrir a versão web no navegador:
```bash
npm run web
```
ela sobe em `http://127.0.0.1:4173` e usa os áudios da pasta `audios/` quando eles existem. sem os arquivos, a biblioteca cai nos sons gerados e nas demonstrações. essa versão abre no navegador e **não** mostra os botões coloridos.

### como gerar o APK

```bash
npm run cap:sync
cd android
./gradlew assembleRelease
```

no windows pode ser `gradlew.bat assembleRelease`. o `.apk` assinado gerado fica em `android/app/build/outputs/apk/release/app-release.apk`.

a assinatura fica em `android/keystore/sleep-my-angel.jks` (com as senhas em `android/keystore.properties`) pra todos os builds usarem a mesma chave. é isso que permite instalar a versão nova por cima da antiga, sem desinstalar. o workflow de `Build Android APK` gera o APK assinado e publica na aba de releases a cada push na `main`, usando a versão do `package.json` como tag.

### livros da estante

os `.epub`, capas e o `manifest.json` que o app lê ficam em `assets/books/`. pra adicionar um livro novo, coloque o arquivo em `assets/books/` e rode:

```bash
node scripts/prepare-books.js
```

ele usa o **Calibre** (`ebook-convert` / `ebook-meta`) pra converter `.azw3`, `.mobi` e `.prc` em `.epub`, extrair a capa e atualizar o manifest. depois é só rodar o build normal. os arquivos de origem do Kindle ficam fora do git; os `.epub` prontos e as capas vão junto com o app.

também dá pra importar livros direto pelo botão **importar livro** (epub, pdf, txt ou md) e escolher uma capa diferente tocando em **✎ capa**.

<br />

### estrutura

```
audios/        minhas faixas locais (não vão pro git)
assets/        ícone, fotos, livros (epub + capas + manifest) e imagens do readme
js/            módulos do app (player, library, cookbook, estante, notas...)
js/updater.js  botão de atualizar o app (fala com o plugin nativo no android)
js/vendor/     epub.js, JSZip, pdf.js e fflate pro leitor rodar offline
scripts/       build da versão web, servidor local e preparo dos livros
android/       projeto nativo em Capacitor
android/keystore/  chave fixa que assina o APK (permite atualizar por cima)
index.html     shell compartilhado entre desktop, android e web
main.js        processo principal do Electron
preload.js     ponte segura do Electron
```

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
  <sub>projeto pessoal em andamento ‧ feito com carinho para noites tranquilas ‧°</sub>
</div>
