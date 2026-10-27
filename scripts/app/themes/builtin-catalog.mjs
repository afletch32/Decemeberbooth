import { migrateHalloweenThemeAssets } from "../../halloween-assets.mjs";

export function createBuiltinThemeData({ pruneUnapprovedThemes, approvedThemeKeys }) {
  let themes = {
    general: {
      name: "General",
      themes: {
        backToSchool: {
          name: "Back to School",
          eventTypes: ["general", "community"],
          fontPairingStyle: "community",
          accent: "#b3261e",
          accent2: "#f5d08a",
          font: "'Bree Serif', serif",
          logo: "",
          backgrounds: [
            "/assets/themes/general-back-to-school/back-to-school-background-landscape.webp",
            "/assets/themes/general-back-to-school/back-to-school-background-portrait.webp",
          ],
          idleScreens: [
            {
              src: "/assets/themes/general-back-to-school/back-to-school-idle-portrait.webp",
              name: "Back to School idle screen portrait",
              role: "idle",
              orientation: "portrait",
              buttonZones: {
                start: { x: 50, y: 75, width: 43, height: 22 },
              },
            },
            {
              src: "/assets/themes/general-back-to-school/back-to-school-idle-landscape.webp",
              name: "Back to School idle screen landscape",
              role: "idle",
              orientation: "landscape",
              buttonZones: {
                start: { x: 50, y: 67, width: 50, height: 19 },
              },
            },
            {
              src: "/assets/themes/general-back-to-school/back-to-school-photo-choice-portrait.webp",
              name: "Back to School photo choice portrait",
              role: "photo-choice",
              orientation: "portrait",
              buttonZones: {
                singlePhoto: { x: 50, y: 39, width: 65, height: 25 },
                photoStrip: { x: 50, y: 75, width: 65, height: 39 },
              },
            },
            {
              src: "/assets/themes/general-back-to-school/back-to-school-photo-choice-landscape.webp",
              name: "Back to School photo choice landscape",
              role: "photo-choice",
              orientation: "landscape",
              buttonZones: {
                singlePhoto: { x: 34, y: 48, width: 32, height: 47 },
                photoStrip: { x: 67, y: 48, width: 32, height: 47 },
              },
            },
          ],
          thankYouScreens: [
            {
              src: "/assets/themes/general-back-to-school/back-to-school-thank-you-portrait.webp",
              name: "Back to School Thank You screen portrait",
              orientation: "portrait",
            },
            {
              src: "/assets/themes/general-back-to-school/back-to-school-thank-you-landscape.webp",
              name: "Back to School Thank You screen landscape",
              orientation: "landscape",
            },
          ],
          overlays: [],
          templates: [],
          welcome: {
            title: "Back to School",
            portrait: "",
            landscape: "",
            prompt: "Tap to start",
          },
          vibeSummary: "Classic classroom warmth with chalkboard, books, and apples",
        },
        birthday: {
          name: "Birthday",
          eventTypes: ["party", "general"],
          fontPairingStyle: "party",
          accent: "pink",
          accent2: "white",
          font: "'Comic Neue', cursive",
          logo: "",
          backgrounds: [
            "https://res.cloudinary.com/afletch32/image/upload/v1783788398/photobooth/events/assets/birthday-background-1_wbydtd.png",
          ],
          overlays: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788398/photobooth/events/assets/birthday-overlay-birthday-confetti-frame_ypmvkq.png", name: "birthday-overlay-birthday-confetti-frame" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788399/photobooth/events/assets/birthday-overlay-balloons_s4ethj.png", name: "birthday-overlay-balloons" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788400/photobooth/events/assets/birthday-overlay-banner_uitu7v.png", name: "birthday-overlay-banner" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788401/photobooth/events/assets/birthday-overlay-goldsparkles_hl8sia.png", name: "birthday-overlay-goldsparkles" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788402/photobooth/events/assets/birthday-overlay-sparkles_t1l3j1.png", name: "birthday-overlay-sparkles" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788403/photobooth/events/assets/birthday-overlay-general-overlay-colorblobs_rh3pea.png", name: "birthday-overlay-colorblobs" },
          ],
          templates: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788403/photobooth/events/assets/birthday-template-birthday-banner_dyaq0j.png", layout: "double_column" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788404/photobooth/events/assets/birthday-template-birthday_smtn3a.png", layout: "double_column" },
          ],
          welcome: {
            title: "Happy Birthday!",
            portrait: "",
            landscape: "",
            prompt: "Touch to start",
          },
        },
        summer: {
          name: "Summer",
          eventTypes: ["party", "community", "general"],
          fontPairingStyle: "party",
          accent: "#00a6c8",
          accent2: "#fff8dc",
          font: "'Comic Neue', cursive",
          logo: "",
          overlays: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788404/photobooth/events/assets/summer-overlay-13_lamyfw.png", name: "summer-overlay-13" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788405/photobooth/events/assets/summer-overlay-4th-of-july_l8lauv.png", name: "summer-overlay-4th-of-july" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788406/photobooth/events/assets/summer-overlay-border-with-frame_kbditt.png", name: "summer-overlay-border-with-frame" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788406/photobooth/events/assets/summer-overlay-border_y1twxc.png", name: "summer-overlay-border" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788408/photobooth/events/assets/summer-overlay-fantasy_ymadoa.png", name: "summer-overlay-fantasy" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788409/photobooth/events/assets/summer-overlay-hello-summer_fetbgw.png", name: "summer-overlay-hello-summer" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788411/photobooth/events/assets/summer-overlay-pool-with-frame-2_b4vum3.png", name: "summer-overlay-pool-with-frame-2" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788413/photobooth/events/assets/summer-overlay-pool-with-frame_rfqjyc.png", name: "summer-overlay-pool-with-frame" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788416/photobooth/events/assets/summer-overlay-tropical-border-2_esslmg.png", name: "summer-overlay-tropical-border-2" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788420/photobooth/events/assets/summer-overlay-tropical-border-with-frame_lne3ia.png", name: "summer-overlay-tropical-border-with-frame" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788423/photobooth/events/assets/summer-overlay-tropical-border_twuynr.png", name: "summer-overlay-tropical-border" },
          ],
          backgrounds: [
            "/assets/themes/summer/summer-background-landscape.mp4",
            "/assets/themes/summer/summer-background-portrait.mp4",
          ],
          idleScreens: [
            {
              src: "/assets/themes/summer/summer-idle-portrait.webp",
              name: "Summer idle portrait",
              role: "idle",
              orientation: "portrait",
              buttonZones: { start: { x: 50, y: 74, width: 48, height: 24 } },
            },
            {
              src: "/assets/themes/summer/summer-idle-landscape.webp",
              name: "Summer idle landscape",
              role: "idle",
              orientation: "landscape",
              buttonZones: { start: { x: 50, y: 78, width: 36, height: 28 } },
            },
            {
              src: "/assets/themes/summer/summer-photo-choice-portrait.mp4",
              name: "Summer photo choice portrait",
              role: "photo-choice",
              orientation: "portrait",
              buttonZones: {
                singlePhoto: { x: 50, y: 42, width: 74, height: 22 },
                photoStrip: { x: 50, y: 72, width: 74, height: 22 },
              },
            },
            {
              src: "/assets/themes/summer/summer-photo-choice-landscape.mp4",
              name: "Summer photo choice landscape",
              role: "photo-choice",
              orientation: "landscape",
              buttonZones: {
                singlePhoto: { x: 32, y: 58, width: 34, height: 48 },
                photoStrip: { x: 68, y: 58, width: 34, height: 48 },
              },
            },
          ],
          thankYouScreens: [
            {
              src: "/assets/themes/summer/summer-thank-you-portrait.webp",
              name: "Summer Thank You portrait",
              orientation: "portrait",
            },
            {
              src: "/assets/themes/summer/summer-thank-you-landscape.webp",
              name: "Summer Thank You landscape",
              orientation: "landscape",
            },
          ],
          welcome: {
            title: "Hello Summer!",
            portrait: "",
            landscape: "",
            prompt: "Touch to start",
          },
        },
      },
    },
    school: {
      name: "School",
      themes: {
        hawks: {
          name: "Spring Hill Hawks",
          eventTypes: ["community", "sports"],
          fontPairingStyle: "community",
          accent: "#041E42",
          accent2: "#16A34A",
          font: "'Anton', sans-serif",
          background: "",
          logo: "/assets/themes/spring-hill-hawks/spring-hill-hawks-logo.png",
          backgrounds: [
            "/assets/themes/spring-hill-hawks/spring-hill-hawks-background-landscape.webp",
            "/assets/themes/spring-hill-hawks/spring-hill-hawks-background-portrait.webp",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788493/photobooth/events/assets/hawks-background-16_mzbqiq.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788494/photobooth/events/assets/hawks-background-blue-green-background_rdyfln.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788495/photobooth/events/assets/hawks-background-1_kl48cl.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788496/photobooth/events/assets/hawks-background-football_bclba6.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788497/photobooth/events/assets/hawks-background-gradient_relljc.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788498/photobooth/events/assets/hawks-background-green-fog_jrxhfq.png",
          ],
          idleScreens: [
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-idle-portrait.webp",
              name: "Spring Hill Hawks idle screen portrait",
              role: "idle",
              orientation: "portrait",
              buttonZones: {
                start: { x: 50, y: 75, width: 68, height: 14 },
              },
            },
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-idle-landscape.webp",
              name: "Spring Hill Hawks idle screen landscape",
              role: "idle",
              orientation: "landscape",
              buttonZones: {
                start: { x: 50, y: 78, width: 48, height: 16 },
              },
            },
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-photo-choice-portrait.webp",
              name: "Spring Hill Hawks photo choice portrait",
              role: "photo-choice",
              orientation: "portrait",
              buttonZones: {
                singlePhoto: { x: 50, y: 48, width: 64, height: 26 },
                photoStrip: { x: 50, y: 74, width: 64, height: 24 },
              },
            },
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-photo-choice-landscape.webp",
              name: "Spring Hill Hawks photo choice landscape",
              role: "photo-choice",
              orientation: "landscape",
              buttonZones: {
                singlePhoto: { x: 31, y: 57, width: 34, height: 45 },
                photoStrip: { x: 69, y: 57, width: 34, height: 45 },
              },
            },
          ],
          thankYouScreens: [
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-thank-you-portrait.webp",
              name: "Spring Hill Hawks Thank You screen portrait",
              orientation: "portrait",
            },
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-thank-you-landscape.webp",
              name: "Spring Hill Hawks Thank You screen landscape",
              orientation: "landscape",
            },
          ],
          overlays: [
            { src: "/assets/school/hawks/overlays/1.png", name: "hawks-overlay-1" },
            { src: "/assets/school/hawks/overlays/2.png", name: "hawks-overlay-2" },
            { src: "/assets/school/hawks/overlays/3.png", name: "hawks-overlay-3" },
            { src: "/assets/school/hawks/overlays/hawks-frame-cheerleader.png", name: "hawks-overlay-cheerleader" },
            { src: "/assets/school/hawks/overlays/hawks-frame-fan.png", name: "hawks-overlay-fan" },
            { src: "/assets/school/hawks/overlays/hawks-frame-go-hawks.png", name: "hawks-overlay-go-hawks" },
            { src: "/assets/school/hawks/overlays/hawks-frame-grass.png", name: "hawks-overlay-grass" },
            { src: "/assets/school/hawks/overlays/hawks-frame-helmets.png", name: "hawks-overlay-helmets" },
            { src: "/assets/school/hawks/overlays/hawks-frame-players.png", name: "hawks-overlay-players" },
          ],
          templates: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788508/photobooth/events/assets/hawks-template-go-hawks_avfpzg.png", layout: "single_photo" },
          ],
          welcome: {
            title: "Spring Hill Hawks",
            portrait: "",
            landscape: "",
            prompt: "Tap to start",
          },
          vibeSummary: "Youth football, sideline spirit, family pride, and Hawks game-day energy",
        },
        hawksTitansStadium: {
          name: "Spring Hill Hawks at Nissan Stadium",
          eventTypes: ["community", "sports"],
          fontPairingStyle: "community",
          accent: "#041E42",
          accent2: "#16A34A",
          font: "'Anton', sans-serif",
          background: "",
          logo: "/assets/themes/spring-hill-hawks/spring-hill-hawks-logo.png",
          backgrounds: [
            "/assets/themes/spring-hill-hawks/nissan-stadium-aerial-day.jpg",
            "/assets/themes/spring-hill-hawks/spring-hill-hawks-background-landscape.webp",
            "/assets/themes/spring-hill-hawks/spring-hill-hawks-background-portrait.webp",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788496/photobooth/events/assets/hawks-background-football_bclba6.png",
          ],
          idleScreens: [
            {
              src: "/assets/themes/spring-hill-hawks/nissan-stadium-river-day.jpg",
              name: "Nissan Stadium river view daytime start screen",
              role: "idle",
              orientation: "portrait",
              buttonZones: { start: { x: 50, y: 78, width: 68, height: 16 } },
            },
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-idle-landscape.webp",
              name: "Hawks at Nissan Stadium idle landscape",
              role: "idle",
              orientation: "landscape",
            },
            {
              src: "/assets/themes/spring-hill-hawks/nissan-stadium-aerial-day.jpg",
              name: "Nissan Stadium aerial field photo choice screen",
              role: "photo-choice",
              orientation: "portrait",
              buttonZones: {
                singlePhoto: { x: 50, y: 48, width: 64, height: 26 },
                photoStrip: { x: 50, y: 74, width: 64, height: 24 },
              },
            },
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-photo-choice-landscape.webp",
              name: "Hawks at Nissan Stadium photo choice landscape",
              role: "photo-choice",
              orientation: "landscape",
            },
          ],
          thankYouScreens: [
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-thank-you-portrait.webp",
              name: "Hawks at Nissan Stadium thank you portrait",
              orientation: "portrait",
            },
            {
              src: "/assets/themes/spring-hill-hawks/spring-hill-hawks-thank-you-landscape.webp",
              name: "Hawks at Nissan Stadium thank you landscape",
              orientation: "landscape",
            },
          ],
          overlays: [
            {
              src: "/assets/themes/spring-hill-hawks/nissan-stadium-frame.svg",
              renderSrc: "/assets/themes/spring-hill-hawks/nissan-stadium-frame.svg",
              name: "Nissan Stadium day game with date",
              orientation: "portrait",
              aspectRatio: "4:5",
              background: { type: "image", src: "/assets/themes/spring-hill-hawks/nissan-stadium-aerial-day.jpg" },
              foreground: { type: "image", src: "/assets/themes/spring-hill-hawks/nissan-stadium-frame.svg" },
              photoSlots: [{ x: 0.116, y: 0.405, width: 0.768, height: 0.379, objectFit: "cover", objectPosition: "center" }],
              textFields: [
                { key: "event_date", xPct: 0.2, yPct: 0.93, wPct: 0.6, hPct: 0.04, fontFamily: "'Anton', sans-serif", fontWeight: "700", fontSize: 30, minFontSize: 18, color: "#ffffff", align: "center" },
              ],
            },
            { src: "/assets/school/hawks/overlays/hawks-frame-go-hawks.png", name: "Hawks stadium game day", orientation: "portrait" },
            { src: "/assets/school/hawks/overlays/hawks-frame-fan.png", name: "Hawks stadium fan", orientation: "landscape" },
            { src: "/assets/school/hawks/overlays/hawks-frame-players.png", name: "Hawks stadium players", orientation: "portrait" },
          ],
          templates: [
            {
              src: "/assets/themes/spring-hill-hawks/nissan-stadium-frame.svg",
              renderSrc: "/assets/themes/spring-hill-hawks/nissan-stadium-frame.svg",
              name: "Nissan Stadium day game photo print",
              layout: "single_photo",
              background: { type: "image", src: "/assets/themes/spring-hill-hawks/nissan-stadium-aerial-day.jpg" },
              foreground: { type: "image", src: "/assets/themes/spring-hill-hawks/nissan-stadium-frame.svg" },
              photoSlots: [{ x: 0.116, y: 0.405, width: 0.768, height: 0.379, objectFit: "cover", objectPosition: "center" }],
              textFields: [
                { key: "event_date", xPct: 0.2, yPct: 0.93, wPct: 0.6, hPct: 0.04, fontFamily: "'Anton', sans-serif", fontWeight: "700", fontSize: 30, minFontSize: 18, color: "#ffffff", align: "center" },
              ],
            },
          ],
          welcome: {
            title: "Hawks Take Nissan Stadium",
            portrait: "",
            landscape: "",
            prompt: "Tap to start",
          },
          vibeSummary: "Spring Hill Hawks game day at Titans Stadium, with team colors and sideline spirit",
        },
        hawksCheer: {
          name: "Spring Hill Hawks Cheer",
          eventTypes: ["community", "sports"],
          fontPairingStyle: "community",
          accent: "#041E42",
          accent2: "#16A34A",
          font: "'Anton', sans-serif",
          background: "",
          logo: "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-logo.png",
          backgrounds: [
            "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-background-landscape.webp",
            "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-background-portrait.webp",
          ],
          idleScreens: [
            {
              src: "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-idle-portrait.webp",
              name: "Spring Hill Hawks Cheer idle screen portrait",
              role: "idle",
              orientation: "portrait",
              buttonZones: {
                start: { x: 50, y: 77, width: 60, height: 13 },
              },
            },
            {
              src: "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-idle-landscape.webp",
              name: "Spring Hill Hawks Cheer idle screen landscape",
              role: "idle",
              orientation: "landscape",
              buttonZones: {
                start: { x: 50, y: 82, width: 44, height: 15 },
              },
            },
            {
              src: "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-photo-choice-portrait.webp",
              name: "Spring Hill Hawks Cheer photo choice portrait",
              role: "photo-choice",
              orientation: "portrait",
              buttonZones: {
                singlePhoto: { x: 50, y: 48, width: 64, height: 26 },
                photoStrip: { x: 50, y: 74, width: 64, height: 24 },
              },
            },
            {
              src: "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-photo-choice-landscape.webp",
              name: "Spring Hill Hawks Cheer photo choice landscape",
              role: "photo-choice",
              orientation: "landscape",
              buttonZones: {
                singlePhoto: { x: 31, y: 57, width: 34, height: 45 },
                photoStrip: { x: 69, y: 57, width: 34, height: 45 },
              },
            },
          ],
          thankYouScreens: [
            {
              src: "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-thank-you-portrait.webp",
              name: "Spring Hill Hawks Cheer Thank You screen portrait",
              orientation: "portrait",
            },
            {
              src: "/assets/themes/spring-hill-hawks-cheer/spring-hill-hawks-cheer-thank-you-landscape.webp",
              name: "Spring Hill Hawks Cheer Thank You screen landscape",
              orientation: "landscape",
            },
          ],
          overlays: [
            {
              "src": "/assets/themes/spring-hill-hawks-cheer/overlays/hawks-cheer-garden-tea-party-single-photo-portrait-simple-v2.png",
              "name": "Hawks Cheer Garden Tea Party Simple Portrait",
              "orientation": "portrait",
              "photoSlots": [
                {
                  "x": 0.068,
                  "y": 0.073,
                  "width": 0.867,
                  "height": 0.77,
                  "objectFit": "cover"
                }
              ]
            },

            {
              "src": "/assets/themes/spring-hill-hawks-cheer/overlays/hawks-cheer-tea-party-single-photo-portrait.png",
              "name": "Hawks Cheer Tea Party Portrait",
              "orientation": "portrait",
              "photoSlots": [
                {
                  "x": 0.1,
                  "y": 0.11,
                  "width": 0.8,
                  "height": 0.7,
                  "objectFit": "cover"
                }
              ]
            },
            {
              "src": "/assets/themes/spring-hill-hawks-cheer/overlays/hawks-cheer-tea-party-single-photo-landscape.png",
              "name": "Hawks Cheer Tea Party Landscape",
              "orientation": "landscape",
              "photoSlots": [
                {
                  "x": 0.08,
                  "y": 0.1,
                  "width": 0.84,
                  "height": 0.68,
                  "objectFit": "cover"
                }
              ]
            },

            { src: "/assets/school/hawks/overlays/1.png", name: "hawks-overlay-1" },
            { src: "/assets/school/hawks/overlays/hawks-frame-cheerleader.png", name: "hawks-overlay-cheerleader" },
            { src: "/assets/school/hawks/overlays/hawks-frame-fan.png", name: "hawks-overlay-fan" },
            { src: "/assets/school/hawks/overlays/hawks-frame-go-hawks.png", name: "hawks-overlay-go-hawks" },
            {
              src: "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-wide-landscape.png",
              name: "Spring Hill Hawks Cheer Pizza Wide Landscape",
              orientation: "landscape",
              photoSlots: [{ x: 0.046, y: 0.1014, width: 0.9068, height: 0.7734 }],
            },
            {
              src: "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-small-landscape.png",
              name: "Spring Hill Hawks Cheer Pizza Small Landscape",
              orientation: "landscape",
              photoSlots: [{ x: 0.0796, y: 0.1098, width: 0.8408, height: 0.6916 }],
            },
            {
              src: "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-portrait.png",
              name: "Spring Hill Hawks Cheer Pizza Portrait",
              orientation: "portrait",
              photoSlots: [{ x: 0.1036, y: 0.0872, width: 0.7896, height: 0.7867 }],
            },
            {
              src: "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-single-photo-portrait-2026.png",
              name: "Spring Hill Hawks 2026 Pizza Single Photo Portrait",
              orientation: "portrait",
              photoSlots: [
                {
                  x: 0.1104,
                  y: 0.1146,
                  width: 0.7793,
                  height: 0.7539,
                  objectFit: "cover",
                },
              ],
            },
            {
              src: "/assets/themes/spring-hill-hawks-cheer/overlays/spring-hill-hawks-cheer-single-photo-portrait-2026.png",
              name: "Spring Hill Hawks 2026 Single Photo Portrait",
              orientation: "portrait",
              photoSlots: [
                {
                  x: 0.1143,
                  y: 0.1152,
                  width: 0.7754,
                  height: 0.7507,
                  objectFit: "cover",
                },
              ],
            },
          ],
          templates: [
            {
              "src": "/assets/themes/spring-hill-hawks-cheer/overlays/hawks-cheer-garden-tea-party-double-2x6-three-photo-strips-simple-v2.png",
              "name": "Hawks Cheer Garden Tea Party Simple Double 2x6 Three-Photo Strips",
              "layout": "photo_strip_3",
              "photoSlots": [
                {
                  "x": 0.075,
                  "y": 0.128,
                  "width": 0.395,
                  "height": 0.208,
                  "sourceIndex": 0
                },
                {
                  "x": 0.075,
                  "y": 0.359,
                  "width": 0.395,
                  "height": 0.21,
                  "sourceIndex": 1
                },
                {
                  "x": 0.075,
                  "y": 0.592,
                  "width": 0.395,
                  "height": 0.22,
                  "sourceIndex": 2
                },
                {
                  "x": 0.532,
                  "y": 0.128,
                  "width": 0.395,
                  "height": 0.208,
                  "sourceIndex": 0
                },
                {
                  "x": 0.532,
                  "y": 0.359,
                  "width": 0.395,
                  "height": 0.21,
                  "sourceIndex": 1
                },
                {
                  "x": 0.532,
                  "y": 0.592,
                  "width": 0.395,
                  "height": 0.22,
                  "sourceIndex": 2
                }
              ]
            },

            {
              "src": "/assets/themes/spring-hill-hawks-cheer/overlays/hawks-cheer-tea-party-double-2x6-three-photo-strips.png",
              "name": "Hawks Cheer Tea Party Double 2x6 Three-Photo Strips",
              "layout": "photo_strip_3",
              "photoSlots": [
                {
                  "x": 0.07,
                  "y": 0.14,
                  "width": 0.38,
                  "height": 0.19,
                  "sourceIndex": 0
                },
                {
                  "x": 0.07,
                  "y": 0.35,
                  "width": 0.38,
                  "height": 0.2,
                  "sourceIndex": 1
                },
                {
                  "x": 0.07,
                  "y": 0.57,
                  "width": 0.38,
                  "height": 0.2,
                  "sourceIndex": 2
                },
                {
                  "x": 0.55,
                  "y": 0.14,
                  "width": 0.38,
                  "height": 0.19,
                  "sourceIndex": 0
                },
                {
                  "x": 0.55,
                  "y": 0.35,
                  "width": 0.38,
                  "height": 0.2,
                  "sourceIndex": 1
                },
                {
                  "x": 0.55,
                  "y": 0.57,
                  "width": 0.38,
                  "height": 0.2,
                  "sourceIndex": 2
                }
              ]
            },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788508/photobooth/events/assets/hawks-template-go-hawks_avfpzg.png", layout: "single_photo" },
            {
              src: "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-3-photo-strip-navy.png",
              name: "Spring Hill Hawks Cheer Pizza Three-Photo Strip Navy",
              layout: "photo_strip_3",
              photoSlots: [
                { x: 0.0629, y: 0.0827, width: 0.8775, height: 0.201, sourceIndex: 0 },
                { x: 0.0629, y: 0.3133, width: 0.8775, height: 0.199, sourceIndex: 1 },
                { x: 0.0629, y: 0.5429, width: 0.8775, height: 0.2, sourceIndex: 2 },
              ],
            },
            {
              src: "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-3-photo-strip-white.png",
              name: "Spring Hill Hawks Cheer Pizza Three-Photo Strip White",
              layout: "photo_strip_3",
              photoSlots: [
                { x: 0.066, y: 0.1, width: 0.868, height: 0.1949, sourceIndex: 0 },
                { x: 0.0627, y: 0.3153, width: 0.8713, height: 0.1969, sourceIndex: 1 },
                { x: 0.066, y: 0.5327, width: 0.8713, height: 0.2031, sourceIndex: 2 },
              ],
            },
            {
              src: "/assets/themes/spring-hill-hawks/pizza/hawks-pizza-double-2x6-three-photo-strips-2026.png",
              name: "Spring Hill Hawks 2026 Pizza Double 2x6 Three-Photo Strips",
              layout: "photo_strip_3",
              photoSlots: [
                { x: 0.0781, y: 0.1354, width: 0.3711, height: 0.1927, sourceIndex: 0 },
                { x: 0.0781, y: 0.3665, width: 0.3711, height: 0.1953, sourceIndex: 1 },
                { x: 0.0781, y: 0.6035, width: 0.3721, height: 0.1934, sourceIndex: 2 },
                { x: 0.5479, y: 0.1354, width: 0.3740, height: 0.1927, sourceIndex: 0 },
                { x: 0.5498, y: 0.3665, width: 0.3721, height: 0.1953, sourceIndex: 1 },
                { x: 0.5498, y: 0.6029, width: 0.3721, height: 0.1934, sourceIndex: 2 },
              ],
            },
            {
              src: "/assets/themes/spring-hill-hawks-cheer/overlays/spring-hill-hawks-cheer-double-2x6-three-photo-strips-2026.png",
              name: "Spring Hill Hawks 2026 Double 2x6 Three-Photo Strips",
              layout: "photo_strip_3",
              photoSlots: [
                { x: 0.0791, y: 0.1367, width: 0.3701, height: 0.1901, sourceIndex: 0 },
                { x: 0.0791, y: 0.3659, width: 0.3701, height: 0.1947, sourceIndex: 1 },
                { x: 0.0791, y: 0.6010, width: 0.3701, height: 0.1940, sourceIndex: 2 },
                { x: 0.5508, y: 0.1367, width: 0.3691, height: 0.1914, sourceIndex: 0 },
                { x: 0.5508, y: 0.3672, width: 0.3701, height: 0.1934, sourceIndex: 1 },
                { x: 0.5508, y: 0.6029, width: 0.3701, height: 0.1934, sourceIndex: 2 },
              ],
            },
          ],
          welcome: {
            title: "Spring Hill Hawks Cheer",
            portrait: "",
            landscape: "",
            prompt: "Tap to start",
          },
          vibeSummary: "Youth rec cheer, green pom-poms, and bright daytime Hawks spirit",
        },
        ane: {
          name: "Amanda North Back to School",
          eventTypes: ["community"],
          fontPairingStyle: "community",
          accent: "#041E42",
          accent2: "#FFB81C",
          font: "'Comic Neue', cursive",
          logo: "",
          backgrounds: [
            "/assets/themes/back-to-school/back-to-school-background-landscape.webp",
            "/assets/themes/back-to-school/back-to-school-background-portrait.webp",
          ],
          idleScreens: [
            {
              src: "/assets/themes/back-to-school/amanda-north-coyotes-idle-wave-portrait.mp4",
              poster: "/assets/themes/back-to-school/back-to-school-idle-portrait.webp",
              name: "Amanda North Coyote waving idle screen",
              role: "idle",
              orientation: "portrait",
              buttonZones: {
                start: { x: 50, y: 88, width: 84, height: 14 },
              },
            },
            {
              src: "/assets/themes/back-to-school/back-to-school-idle-landscape.webp",
              name: "Amanda North Coyote idle screen landscape",
              role: "idle",
              orientation: "landscape",
              buttonZones: {
                start: { x: 50, y: 78, width: 52, height: 18 },
              },
            },
            {
              src: "/assets/themes/back-to-school/back-to-school-photo-choice-portrait.webp",
              name: "Amanda North Coyote photo choice portrait",
              role: "photo-choice",
              orientation: "portrait",
              buttonZones: {
                singlePhoto: { x: 50, y: 40, width: 78, height: 28 },
                photoStrip: { x: 50, y: 70, width: 78, height: 28 },
              },
            },
            {
              src: "/assets/themes/back-to-school/back-to-school-photo-choice-landscape.webp",
              name: "Amanda North Coyote photo choice landscape",
              role: "photo-choice",
              orientation: "landscape",
              buttonZones: {
                singlePhoto: { x: 35, y: 60, width: 31, height: 52 },
                photoStrip: { x: 70, y: 60, width: 31, height: 52 },
              },
            },
          ],
          shareScreens: [
            {
              src: "/assets/themes/back-to-school/back-to-school-share-portrait.webp",
              orientation: "portrait",
              name: "Amanda North Coyote share screen portrait",
            },
            {
              src: "/assets/themes/back-to-school/back-to-school-share-landscape.webp",
              orientation: "landscape",
              name: "Amanda North Coyote share screen landscape",
            },
          ],
          thankYouScreens: [
            {
              src: "/assets/themes/back-to-school/back-to-school-thank-you-portrait.webp",
              name: "Amanda North Coyote Thank You screen portrait",
              orientation: "portrait",
            },
            {
              src: "/assets/themes/back-to-school/back-to-school-thank-you-landscape.webp",
              name: "Amanda North Coyote Thank You screen landscape",
              orientation: "landscape",
            },
          ],
          overlays: [
            { src: "/assets/themes/back-to-school/overlays/amanda-north-back-to-school-overlay-single-photo-portrait.png", orientation: "portrait", name: "Amanda North Back to School single photo portrait" },
            { src: "/assets/themes/back-to-school/overlays/amanda-north-back-to-school-overlay-school-supply-portrait.png", orientation: "portrait", name: "Amanda North Back to School school supply portrait" },
            { src: "/assets/themes/back-to-school/overlays/amanda-north-back-to-school-overlay-primary-portrait.png", orientation: "portrait", name: "Amanda North Back to School primary portrait frame" },
            { src: "/assets/themes/back-to-school/overlays/amanda-north-back-to-school-overlay-single-photo-landscape.png", orientation: "landscape", name: "Amanda North Back to School single photo landscape" },
          ],
          templates: [],
          welcome: {
            title: "ANE",
            portrait: "",
            landscape: "",
            prompt: "Touch to start",
          },
        },
        streamNight: {
          name: "Amanda North STREAM Night",
          eventTypes: ["community"],
          fontPairingStyle: "community",
          accent: "#0e62d9",
          accent2: "#f7bf21",
          font: "'Comic Neue', cursive",
          logo: "",
          backgrounds: [
            "/assets/themes/stream-night/stream-night-background-landscape.webp",
            "/assets/themes/stream-night/stream-night-background-portrait.webp",
          ],
          idleScreens: [
            {
              src: "/assets/themes/stream-night/stream-night-idle-portrait.webp",
              name: "Amanda North STREAM Night idle portrait",
              role: "idle",
              orientation: "portrait",
              buttonZones: {
                start: { x: 50, y: 86, width: 80, height: 14 },
              },
            },
            {
              src: "/assets/themes/stream-night/stream-night-idle-landscape.webp",
              name: "Amanda North STREAM Night idle landscape",
              role: "idle",
              orientation: "landscape",
              buttonZones: {
                start: { x: 50, y: 76, width: 52, height: 18 },
              },
            },
            {
              src: "/assets/themes/stream-night/stream-night-photo-choice-portrait.webp",
              name: "Amanda North STREAM Night photo choice portrait",
              role: "photo-choice",
              orientation: "portrait",
              buttonZones: {
                singlePhoto: { x: 50, y: 40, width: 78, height: 28 },
                photoStrip: { x: 50, y: 70, width: 78, height: 28 },
              },
            },
            {
              src: "/assets/themes/stream-night/stream-night-photo-choice-landscape.webp",
              name: "Amanda North STREAM Night photo choice landscape",
              role: "photo-choice",
              orientation: "landscape",
              buttonZones: {
                singlePhoto: { x: 29, y: 60, width: 36, height: 52 },
                photoStrip: { x: 71, y: 60, width: 36, height: 52 },
              },
            },
          ],
          thankYouScreens: [
            {
              src: "/assets/themes/stream-night/stream-night-thank-you-portrait.webp",
              name: "Amanda North STREAM Night Thank You screen portrait",
              orientation: "portrait",
            },
            {
              src: "/assets/themes/stream-night/stream-night-thank-you-landscape.webp",
              name: "Amanda North STREAM Night Thank You screen landscape",
              orientation: "landscape",
            },
          ],
          overlays: [
            {
              src: "https://res.cloudinary.com/afletch32/image/upload/v1783788490/photobooth/events/assets/ane-overlay-ane-frame-stream-night-landscape-2_tbkq3g.png",
              name: "ane-overlay-frame-stream-night-landscape",
            },
          ],
          templates: [],
          welcome: {
            title: "STREAM Night",
            portrait: "",
            landscape: "",
            prompt: "Touch to start",
          },
          vibeSummary: "Nighttime discovery, maker energy, and coyote pride",
        },
      },
    },
    fall: {
      name: "Fall",
      holidays: {
        halloween: {
          name: "Halloween",
          accent: "orange",
          accent2: "white",
          font: "'Creepster', cursive",
          logo: "",
          backgrounds: [
            "/assets/themes/halloween/halloween-fog-background-portrait.mp4",
            "/assets/themes/halloween/halloween-fog-background-landscape.mp4",
          ],
          idleScreens: [
            { src: "/assets/themes/halloween/halloween-idle-portrait.webp", name: "Halloween idle portrait", role: "idle", orientation: "portrait", buttonZones: { start: { x: 50, y: 82, width: 58, height: 18 } } },
            { src: "/assets/themes/halloween/halloween-idle-landscape.webp", name: "Halloween idle landscape", role: "idle", orientation: "landscape", buttonZones: { start: { x: 51, y: 77, width: 48, height: 22, variant: "marquee" } } },
            { src: "/assets/themes/halloween/halloween-photo-choice-portrait.webp", name: "Halloween photo choice portrait", role: "photo-choice", orientation: "portrait", buttonZones: { singlePhoto: { x: 50, y: 43, width: 76, height: 22 }, photoStrip: { x: 50, y: 72, width: 76, height: 22 } } },
            { src: "/assets/themes/halloween/halloween-photo-choice-landscape.webp", name: "Halloween photo choice landscape", role: "photo-choice", orientation: "landscape", buttonZones: { singlePhoto: { x: 30, y: 55, width: 34, height: 48 }, photoStrip: { x: 70, y: 55, width: 34, height: 48 } } },
          ],
          thankYouScreens: [
            { src: "/assets/themes/halloween/halloween-thank-you-portrait.webp", name: "Halloween Thank You portrait", orientation: "portrait" },
            { src: "/assets/themes/halloween/halloween-thank-you-landscape.webp", name: "Halloween Thank You landscape", orientation: "landscape" },
          ],
          overlays: [],
          templates: [],
          welcome: {
            title: "Happy Halloween!",
            portrait: "",
            landscape: "",
            prompt: "Tap to Start",
          },
          soundEffects: {
            start: "/assets/sounds/witchcomein.mp3",
            tap: "/assets/sounds/firemagic.mp3",
            photoCaptured: "/assets/sounds/healingmagic.mp3",
            goodbye: "/assets/sounds/witchlaugh.mp3",
          },
        },
      },
    },
    winter: {
      name: "Winter",
      holidays: {
        christmas: {
          name: "Christmas",
          accent: "#c41e3a",
          accent2: "white",
          font: "'Comic Neue', cursive",
          logo: "",
          backgrounds: [
            "https://res.cloudinary.com/afletch32/image/upload/v1783788477/photobooth/events/assets/winter-christmas-background-christmas-background-1_rgvubw.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788478/photobooth/events/assets/winter-christmas-background-christmas-background-2_eahwkm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788479/photobooth/events/assets/winter-christmas-background-christmas-background-3_huffgo.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788481/photobooth/events/assets/winter-christmas-background-christmas-background-4_ubpjoy.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788483/photobooth/events/assets/winter-christmas-background-christmas-background-5_rkzpcb.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788485/photobooth/events/assets/winter-christmas-background-christmas_dn0mcm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-background-winter_xents8.png",
          ],
          overlays: [],
          templates: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-template-christmas-template-1_nru96z.png", layout: "single_photo" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788487/photobooth/events/assets/winter-christmas-template-merry-christmas_c15dyi.png", layout: "double_column" },
          ],
          welcome: {
            title: "Merry Christmas!",
            portrait: "",
            landscape: "",
            prompt: "Touch to start the fun!",
          },
        },
        winterWonderland: {
          name: "Winter Wonderland",
          accent: "#b7e3ff",
          accent2: "#ffffff",
          fontHeading: "'Playfair Display', serif",
          fontBody: "'Montserrat', sans-serif",
          logo: "",
          backgrounds: [
            "https://res.cloudinary.com/afletch32/image/upload/v1783788477/photobooth/events/assets/winter-christmas-background-christmas-background-1_rgvubw.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788478/photobooth/events/assets/winter-christmas-background-christmas-background-2_eahwkm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788479/photobooth/events/assets/winter-christmas-background-christmas-background-3_huffgo.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788481/photobooth/events/assets/winter-christmas-background-christmas-background-4_ubpjoy.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788483/photobooth/events/assets/winter-christmas-background-christmas-background-5_rkzpcb.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788485/photobooth/events/assets/winter-christmas-background-christmas_dn0mcm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-background-winter_xents8.png",
          ],
          overlays: [],
          templates: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-template-christmas-template-1_nru96z.png", layout: "single_photo" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788487/photobooth/events/assets/winter-christmas-template-merry-christmas_c15dyi.png", layout: "double_column" },
          ],
          welcome: {
            title: "Winter Wonderland",
            portrait: "",
            landscape: "",
            prompt: "Touch to start",
          },
          vibeParentKey: "winter:christmas",
          vibeSummary: "Timeless, snowy, magical",
        },
        santasWorkshop: {
          name: "Santa's Workshop",
          accent: "#d62828",
          accent2: "#ffffff",
          fontHeading: "'Mountains of Christmas', cursive",
          fontBody: "'Poppins', sans-serif",
          logo: "",
          backgrounds: [
            "https://res.cloudinary.com/afletch32/image/upload/v1783788477/photobooth/events/assets/winter-christmas-background-christmas-background-1_rgvubw.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788478/photobooth/events/assets/winter-christmas-background-christmas-background-2_eahwkm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788479/photobooth/events/assets/winter-christmas-background-christmas-background-3_huffgo.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788481/photobooth/events/assets/winter-christmas-background-christmas-background-4_ubpjoy.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788483/photobooth/events/assets/winter-christmas-background-christmas-background-5_rkzpcb.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788485/photobooth/events/assets/winter-christmas-background-christmas_dn0mcm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-background-winter_xents8.png",
          ],
          overlays: [],
          templates: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-template-christmas-template-1_nru96z.png", layout: "single_photo" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788487/photobooth/events/assets/winter-christmas-template-merry-christmas_c15dyi.png", layout: "double_column" },
          ],
          welcome: {
            title: "Santa's Workshop",
            portrait: "",
            landscape: "",
            prompt: "Touch to start",
          },
          vibeParentKey: "winter:christmas",
          vibeSummary: "Playful, festive, nostalgic",
        },
        newyear: {
          name: "New Year",
          accent: "#FFD700",
          accent2: "white",
          font: "'Comic Neue', cursive",
          logo: "",
          backgrounds: [
            "https://res.cloudinary.com/afletch32/image/upload/v1783788477/photobooth/events/assets/winter-christmas-background-christmas-background-1_rgvubw.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788478/photobooth/events/assets/winter-christmas-background-christmas-background-2_eahwkm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788479/photobooth/events/assets/winter-christmas-background-christmas-background-3_huffgo.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788481/photobooth/events/assets/winter-christmas-background-christmas-background-4_ubpjoy.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788483/photobooth/events/assets/winter-christmas-background-christmas-background-5_rkzpcb.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788485/photobooth/events/assets/winter-christmas-background-christmas_dn0mcm.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-background-winter_xents8.png",
          ],
          overlays: [],
          templates: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788486/photobooth/events/assets/winter-christmas-template-christmas-template-1_nru96z.png", layout: "single_photo" },
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788487/photobooth/events/assets/winter-christmas-template-merry-christmas_c15dyi.png", layout: "double_column" },
          ],
          welcome: {
            title: "Happy New Year!",
            portrait: "",
            landscape: "",
            prompt: "Start the countdown!",
          },
        },
        valentines: {
          name: "Valentine's Day",
          accent: "#ff5e91",
          accent2: "white",
          font: "'Comic Neue', cursive",
          logo: "",
          backgrounds: [
            "https://res.cloudinary.com/afletch32/image/upload/v1783788488/photobooth/events/assets/winter-valentines-background-valentines-background-1_cpm0t5.png",
            "https://res.cloudinary.com/afletch32/image/upload/v1783788489/photobooth/events/assets/winter-valentines-background-valentines-background-2_hsfkek.png",
          ],
          overlays: [],
          templates: [
            { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788490/photobooth/events/assets/winter-valentines-template-valentines-pink_gi5wxf.png", layout: "single_photo" },
          ],
          welcome: {
            title: "Happy Valentine's Day!",
            portrait: "",
            landscape: "",
            prompt: "Touch to start",
          },
        },
      },
    },
  };

  themes.summer = {
    name: "Summer",
    holidays: {
      fourthofjuly: {
        name: "Fourth of July",
        eventTypes: ["party", "community", "general"],
        fontPairingStyle: "party",
        accent: "#d62828",
        accent2: "#1d4ed8",
        font: "'Comic Neue', cursive",
        background: "",
        logo: "",
        backgrounds: [],
        overlays: [
          { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788473/photobooth/events/assets/summer-4th-of-july-overlay-4thoverlay_zcvowb.png", name: "summer-4th-of-july-overlay-4thoverlay" },
          { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788476/photobooth/events/assets/summer-4th-of-july-overlay-4thoverlay1_wolx9b.png", name: "summer-4th-of-july-overlay-4thoverlay1" },
        ],
        templates: [],
        welcome: {
          title: "Happy Fourth of July!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
    },
  };

  themes.spring = {
    name: "Spring",
    holidays: {
      stpatricksday: {
        name: "St. Patrick's Day",
        accent: "#0f6d2f",
        accent2: "white",
        font: "'Comic Neue', cursive",
        logo: "",
        backgrounds: [
          "https://res.cloudinary.com/afletch32/image/upload/v1783788469/photobooth/events/assets/spring-st-patricks-day-background-st-patricks-day-background-1_cl1xyx.png",
        ],
        overlays: [],
        templates: [
          { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788470/photobooth/events/assets/spring-st-patricks-day-template-st-patricks-day-template-1_z3lcap.png", layout: "single_photo" },
          { src: "https://res.cloudinary.com/afletch32/image/upload/v1783788471/photobooth/events/assets/spring-st-patricks-day-template-st-patricks-day_baggtg.png", layout: "double_column" },
        ],
        welcome: {
          title: "Happy St. Patrick's Day!",
          portrait: "",
          landscape: "",
          prompt: "Touch to start",
        },
      },
    },
  };

  themes.fall.holidays.cuteHalloween = {
    name: "Happy Halloween",
    eventTypes: ["party", "community", "general"],
    fontPairingStyle: "party",
    accent: "#d946ef",
    accent2: "#f5b4ff",
    font: "'Comic Neue', cursive",
    logo: "",
    backgrounds: [
      "/assets/themes/cute-halloween/cute-halloween-background-portrait.webp",
      "/assets/themes/cute-halloween/cute-halloween-background-landscape.webp",
    ],
    idleScreens: [
      { src: "/assets/themes/cute-halloween/cute-halloween-idle-portrait.webp", name: "Happy Halloween idle portrait", role: "idle", orientation: "portrait", buttonZones: { start: { x: 50, y: 82, width: 58, height: 18 } } },
      { src: "/assets/themes/cute-halloween/cute-halloween-idle-landscape.webp", name: "Happy Halloween idle landscape", role: "idle", orientation: "landscape", buttonZones: { start: { x: 50, y: 82, width: 38, height: 20 } } },
      { src: "/assets/themes/cute-halloween/cute-halloween-photo-choice-portrait.webp", name: "Happy Halloween photo choice portrait", role: "photo-choice", orientation: "portrait", buttonZones: { singlePhoto: { x: 50, y: 43, width: 76, height: 22 }, photoStrip: { x: 50, y: 72, width: 76, height: 22 } } },
      { src: "/assets/themes/cute-halloween/cute-halloween-photo-choice-landscape.webp", name: "Happy Halloween photo choice landscape", role: "photo-choice", orientation: "landscape", buttonZones: { singlePhoto: { x: 30, y: 55, width: 34, height: 48 }, photoStrip: { x: 70, y: 55, width: 34, height: 48 } } },
    ],
    thankYouScreens: [
      { src: "/assets/themes/cute-halloween/cute-halloween-thank-you-portrait.webp", name: "Happy Halloween Thank You portrait", orientation: "portrait" },
      { src: "/assets/themes/cute-halloween/cute-halloween-thank-you-landscape.webp", name: "Happy Halloween Thank You landscape", orientation: "landscape" },
    ],
    overlays: [],
    templates: [],
    welcome: { title: "Happy Halloween", portrait: "", landscape: "", prompt: "Tap to Start" },
  };

  migrateHalloweenThemeAssets(themes);

  themes.general.themes.averyBirthday = {
    ...JSON.parse(JSON.stringify(themes.general.themes.birthday)),
    name: "Avery's Birthday",
    welcome: {
      ...themes.general.themes.birthday.welcome,
      title: "Happy 14th, Avery!",
      prompt: "Tap to Start",
    },
    soundEffects: {
      start: "/assets/themes/avery-birthday/sounds/the-amazing-digital-circus.mp3",
      photoCaptured: "/assets/themes/avery-birthday/sounds/my-my-thats-quite-a-bit-of-moxie.mp3",
      shareReady: "/assets/themes/avery-birthday/sounds/what-do-you-think.mp3",
      shareReadyAlternates: [
        "/assets/themes/avery-birthday/sounds/what-do-you-think.mp3",
        "/assets/themes/avery-birthday/sounds/adam-what-do-you-think.mp3",
      ],
    },
    soundProfile: {
      tap: "digital-circus-button",
      flash: "vintage-camera",
    },
    overlays: [
      {
        src: "/assets/themes/avery-birthday/avery-birthday-carnival-overlay-portrait.png",
        name: "Avery birthday carnival overlay portrait",
        type: "photo",
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-carnival-overlay-landscape.png",
        name: "Avery birthday carnival overlay landscape",
        type: "photo",
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-infernal-town-overlay-portrait.png",
        name: "Avery infernal town overlay portrait",
        type: "photo",
        background: {
          type: "image",
          src: "/assets/themes/avery-birthday/avery-birthday-infernal-town-background-portrait.webp",
        },
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-infernal-town-overlay-landscape.png",
        name: "Avery infernal town overlay landscape",
        type: "photo",
        background: {
          type: "image",
          src: "/assets/themes/avery-birthday/avery-birthday-infernal-town-background-landscape.webp",
        },
      },
      ...themes.general.themes.birthday.overlays,
    ],
    backgrounds: [
      "/assets/themes/avery-birthday/avery-birthday-background-landscape.webp",
    ],
    greenBackgrounds: [
      "/assets/themes/avery-birthday/avery-birthday-infernal-town-background-portrait.webp",
      "/assets/themes/avery-birthday/avery-birthday-infernal-town-background-landscape.webp",
    ],
    shareScreens: [
      {
        src: "/assets/themes/avery-birthday/avery-birthday-share-portrait.webp",
        orientation: "portrait",
        name: "Avery birthday share screen portrait",
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-background-landscape.webp",
        orientation: "landscape",
        name: "Avery birthday character-free share screen landscape",
      },
    ],
    thankYouScreens: [
      {
        src: "/assets/themes/avery-birthday/avery-birthday-thank-you-portrait.webp",
        orientation: "portrait",
        name: "Avery birthday thank-you screen portrait",
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-thank-you-landscape.webp",
        orientation: "landscape",
        name: "Avery birthday thank-you screen landscape",
      },
    ],
    idleScreens: [
      {
        src: "/assets/themes/avery-birthday/avery-birthday-idle-portrait.webp",
        name: "Avery birthday portrait idle screen",
        role: "idle",
        orientation: "portrait",
        buttonZones: {
          start: { x: 50, y: 78, width: 58, height: 20 },
        },
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-idle-landscape.webp",
        name: "Avery birthday idle screen",
        role: "idle",
        orientation: "landscape",
        buttonZones: {
          start: { x: 50, y: 81, width: 55, height: 24 },
        },
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-photo-choice-portrait.webp",
        name: "Avery birthday portrait photo choice screen",
        role: "photo-choice",
        orientation: "portrait",
        buttonZones: {
          singlePhoto: { x: 50, y: 52, width: 70, height: 24 },
          photoStrip: { x: 50, y: 77, width: 70, height: 24 },
        },
      },
      {
        src: "/assets/themes/avery-birthday/avery-birthday-photo-choice-landscape.webp",
        name: "Avery birthday photo choice screen",
        role: "photo-choice",
        orientation: "landscape",
        buttonZones: {
          singlePhoto: { x: 35, y: 68, width: 27, height: 49 },
          photoStrip: { x: 65, y: 68, width: 27, height: 49 },
        },
      },
    ],
  };

  pruneUnapprovedThemes(themes, approvedThemeKeys);

  const BUILTIN_THEMES = JSON.parse(JSON.stringify(themes));
  return { themes, BUILTIN_THEMES };
}
