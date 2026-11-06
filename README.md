<div align="center">

<img src="assets/readme-photos/divider.png" width="100%" alt="divider" />

# sleep my angel

**meu aplicativo de sono, frequências relaxantes, afirmações da lei da suposição e rituais da noite**

<img src="assets/readme-photos/start_readme.png" width="460" alt="sleep my angel vibe" />

</div>

<br />

esse é um projeto que eu já estava rascunhando há um tempo e finalmente resolvi estruturar certinho pra me ajudar a dormir em paz. quem tem insônia ou a cabeça cheia antes de deitar sabe como é difícil desacelerar, então quis criar um app bem bonitinho e confortável só meu pra ter tudo que preciso em um lugar só.

a ideia central do **sleep my angel** é juntar sons de chuva, ruídos relaxantes e meditações funcionando em segundo plano no celular ou computador, sem anúncios ou interrupções chatas, com um cantinho dedicado à lei da suposição (principalmente inspirada nas palestras e visões do Edward Art e Neville Goddard).

o app foi feito como **APK nativo para Android** (com projeto Capacitor e Gradle) e também pode rodar no desktop.

ainda é uma base que vou continuar arrumando e deixando cada vez mais com a minha cara, mas a estrutura principal já tá rodando.

<br />

<div align="center">
  <img src="assets/readme-photos/divider.png" width="100%" alt="divider" />
</div>

### o que tem no app

- **ícone oficial & foto customizável**: o ícone do APK no seu celular é a arte oficial da pastinha `assets/icon/`, e dentro do app você pode tocar na foto de perfil para escolher qualquer foto da sua galeria.
- **library estilo spotify (clean & cinza)**: grade com estética suave em tons de cinza e pastéis para navegar pelos áudios de chuva, meditações e frequências sonoras (ondas theta, pink noise e ruídos suaves). permite criar playlists personalizadas por cores e buscar qualquer som.
- **áudio em 2º plano no android**: permissões nativas de serviço em primeiro plano e wake lock para o som continuar tocando mesmo quando você apagar a tela do celular ou mudar de app.
- **cantinho da lei da suposição & edward art**: cartões de afirmações e lembretes de que a imaginação é a única realidade. conta também com reprodução de voz suave em português para ouvir deitada antes de adormecer com a sensação do desejo já consumado.
- **receitas de antes de dormir**: espaço dedicado pras minhas bebidinhas noturnas favoritas pra desacelerar o corpo (principalmente meu amado leite quente com mel e canela kkk, mas também moon milk de camomila e chá relaxante).
- **contador & sleep timer suave**: timer programável (15m, 30m, 45m, 1h, 2h) que vai reduzindo gradualmente o volume nos últimos instantes para não dar susto quando você estiver quase pegando no sono.
- **notion script offline**: visualizador e editor de texto para guardar e lapidar os scripts de manifestação e rotina noturna sem precisar de conexão com a internet.
- **estética retro mello**: janelinha com jeitinho de sistema antigo, perfil fofo, pílulas suaves e controles delicados.

<br />

<div align="center">
  <img src="assets/readme-photos/divider.png" width="100%" alt="divider" />
</div>

### como baixar e instalar o APK no celular

1. vá na aba de [**Releases**](https://github.com/sorodeleite/sleep-my-angel/releases) deste repositório.
2. baixe o arquivo `sleep-my-angel.apk`.
3. abra o arquivo no seu celular Android e confirme a instalação (se pedir, autorize a instalação de fontes desconhecidas).
4. prontinho! o app vai aparecer na sua tela inicial.

<br />

### como rodar ou compilar pelo computador

se quiser rodar ou gerar o APK localmente pelo código:

1. baixe ou clone o repositório:
```bash
git clone https://github.com/sorodeleite/sleep-my-angel.git
cd "sleep my angel"
```
2. instale as dependências:
```bash
npm install
```
3. para compilar o APK no Android Studio ou terminal:
```bash
npx cap sync android
cd android
./gradlew assembleDebug
```
o arquivo `.apk` gerado fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

ou para rodar no desktop:
```bash
npm start
```

<br />

<div align="center">
  <img src="assets/readme-photos/divider.png" width="100%" alt="divider" />
  <br /><br />
  <img src="assets/readme-photos/end.webp" width="280" alt="end" />
  <br /><br />
  <sub>projeto pessoal em andamento ‧ feito com carinho para noites tranquilas ‧°</sub>
</div>
