# 📱 Сборка Nova как Android-приложения

Этот документ — инструкция как из веб-проекта Nova получить нативное Android-приложение (APK для теста / AAB для Google Play).

---

## Что уже сделано в проекте

- ✅ Установлен Capacitor 6 + 14 нативных плагинов
- ✅ Настроен `capacitor.config.ts` (appId `ru.nova.messenger`)
- ✅ Создана универсальная обёртка `src/lib/native.ts` — работает и в браузере, и в нативном Android
- ✅ Обработана системная кнопка «Назад» и сплеш-скрин в `src/App.tsx`
- ✅ Готов PWA-манифест и Service Worker

---

## Что нужно установить на твой компьютер (один раз)

### 1. Node.js + Bun (для сборки веб-части)
- https://nodejs.org (LTS-версия)
- https://bun.sh

### 2. JDK 17 (Android Gradle Plugin требует именно его)
- Скачай **Temurin 17** → https://adoptium.net/temurin/releases/?version=17
- Установщик сам пропишет `JAVA_HOME`

### 3. Android Studio
- https://developer.android.com/studio
- При первом запуске установи: **Android SDK Platform 34**, **Android SDK Build-Tools 34**, **Android SDK Command-line Tools**, **Android Emulator** (если хочешь тестировать без телефона)

### 4. Переменные окружения

**Windows** (PowerShell, один раз):
```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("Path", "$env:Path;$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")
```

**macOS / Linux** (`~/.zshrc` или `~/.bashrc`):
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
# export ANDROID_HOME=$HOME/Android/Sdk         # Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

---

## Первая сборка (5 шагов)

Открой терминал в папке проекта.

### Шаг 1. Скачать зависимости
```bash
bun install
```

### Шаг 2. Собрать веб-часть
```bash
bun run build
```
Это создаст папку `dist/` — её Capacitor упакует в Android-приложение.

### Шаг 3. Создать нативный Android-проект
```bash
npx cap add android
```
**После этой команды появится папка `android/`** — это и есть полноценный Android Studio проект. Делается **один раз**, потом эту команду больше запускать не нужно.

### Шаг 4. Сгенерировать иконки и сплеш (опционально, но рекомендую)
1. Положи иконку 1024×1024 в `resources/icon.png` (см. `resources/README.md`)
2. Запусти:
```bash
npx @capacitor/assets generate --android
```
Все размеры иконок (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) и сплеш-экраны создадутся автоматически.

### Шаг 5. Запустить в Android Studio
```bash
npx cap open android
```
Откроется Android Studio с готовым проектом. Нажми ▶️ Run — и приложение запустится в эмуляторе или на подключённом телефоне.

---

## Команды на каждый день

После любых правок React-кода:

```bash
# 1. Пересобрать веб + синхронизировать с Android
bun run build && npx cap sync android

# 2. Запустить (через Android Studio или напрямую)
npx cap run android
```

Или короче — собрать APK сразу из терминала:

```bash
bun run build && npx cap sync android && cd android && ./gradlew assembleDebug
```

Готовый APK будет в `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Релизная сборка для Google Play

### 1. Сгенерируй ключ подписи (один раз)
```bash
keytool -genkey -v -keystore nova-release.keystore -alias nova -keyalg RSA -keysize 2048 -validity 10000
```
**Сохрани файл `nova-release.keystore` и пароли в надёжном месте — если потеряешь, обновлять приложение в Google Play не сможешь.**

### 2. Подключи ключ в `android/app/build.gradle`
В блок `android { ... }` добавь:
```gradle
signingConfigs {
    release {
        storeFile file('../../nova-release.keystore')
        storePassword 'ТВОЙ_ПАРОЛЬ'
        keyAlias 'nova'
        keyPassword 'ТВОЙ_ПАРОЛЬ'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 3. Собери AAB
```bash
bun run build && npx cap sync android && cd android && ./gradlew bundleRelease
```
Готовый AAB будет в `android/app/build/outputs/bundle/release/app-release.aab` — этот файл загружается в Google Play Console.

---

## Куда подключать сайт (или работать оффлайн)

В `capacitor.config.ts`:

**Вариант А — упаковать веб в приложение** (по умолчанию):
- `webDir: "dist"` — приложение работает оффлайн, нужна пересборка при обновлении.

**Вариант Б — загружать с сайта**:
```ts
server: {
  url: "https://nova.example.com",
  cleartext: false,
  androidScheme: "https",
}
```
Тогда приложение всегда показывает живой сайт — обновлять Play-релиз не нужно.

---

## Что доступно из нативных API

Через `import { native } from "@/lib/native"`:

| Метод | Что делает |
|-------|-----------|
| `native.isNative` | `true` если запущено как Android-приложение |
| `native.haptic.light()` / `.medium()` / `.heavy()` / `.success()` / `.error()` | Вибро-отклик |
| `native.share({ title, text, url })` | Системная шторка «Поделиться» |
| `native.clipboard.write(text)` / `.read()` | Буфер обмена |
| `native.network.status()` / `.onChange(cb)` | Состояние сети |
| `native.storage.get(key)` / `.set(key, val)` | Надёжное хранилище (вместо localStorage) |
| `native.deviceInfo()` | Модель, ОС, версия |
| `native.dialog.alert()` / `.confirm()` / `.prompt()` | Нативные диалоги |
| `native.openUrl(url)` | Открыть ссылку во встроенном браузере |
| `native.takePhoto({ source })` | Камера или галерея |
| `native.geo.get()` | Координаты GPS |
| `native.keyboard.hide()` / `.show()` | Управление клавиатурой |
| `native.statusBar.setColor("#hex")` | Цвет статус-бара |
| `native.push.register(onToken, onMessage)` | FCM push-уведомления |
| `native.localNotify.show(title, body)` | Локальное уведомление |
| `native.app.exit()` / `.onBackButton(cb)` / `.onPause(cb)` / `.onResume(cb)` | Жизненный цикл |

Каждый метод в браузере работает через web-фоллбек (Web Share API, navigator.clipboard, vibrate и т.д.) — твой код будет работать одинаково везде.

---

## Push-уведомления (FCM)

1. Создай проект в Firebase Console → https://console.firebase.google.com
2. Добавь Android-приложение, package: `ru.nova.messenger`
3. Скачай `google-services.json` → положи в `android/app/`
4. После `npx cap sync android` — всё подхватится автоматически

В коде:
```ts
native.push.register(
  (fcmToken) => {
    // отправь токен на свой бэкенд для рассылки push
  },
  (notif) => {
    console.log("получено push:", notif);
  }
);
```

---

## Типичные проблемы

**`SDK location not found`** → не настроен `ANDROID_HOME`, см. блок «Переменные окружения».

**`JAVA_HOME is not set`** → переустанови JDK 17 (Temurin), он сам прописывает.

**`Gradle build failed`** → открой `android/` в Android Studio, дай ему «Sync Project with Gradle Files», обычно само лечится.

**Белый экран в эмуляторе** → забыл `bun run build` перед `npx cap sync`. Веб-часть пустая.

**`Error: command failed: gradlew`** на Mac/Linux → `chmod +x android/gradlew`.

---

## Опубликовать в Google Play

1. Зарегистрируйся в Google Play Console ($25 разовый платёж) → https://play.google.com/console
2. Создай приложение, заполни описание и скриншоты
3. Загрузи `app-release.aab`
4. Заполни анкету о контенте, целевой аудитории, политике конфиденциальности
5. Ревью обычно 1–3 дня, потом приложение появится в Play Store

---

## Готово!

Если что-то не запускается — пиши, разберёмся.
