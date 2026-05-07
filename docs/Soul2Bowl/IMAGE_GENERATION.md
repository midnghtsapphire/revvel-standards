# Soul2Bowl Image Generation Guide

> Use these APIs to generate professional food images for Soul2Bowl.

## AI Image Generation APIs Available

| Service | Use For | Where to Get Key |
|---------|--------|-----------------|
| **Leonardo.ai** | Food photos, realistic images | leonardo.ai/api |
| **Eleven Labs** | Voiceovers (future) | elevenlabs.io |
| **HeyGen** | AI avatars, video | heygen.com |
| **OpenAI DALL-E** | General AI images | platform.openai.com |
| **Midjourney** | High-quality food | via Discord bot |

## Generation Prompts for Food

### Soul Bowl (BBQ)
```
Professional food photography, Southern BBQ beef bowl, smoked brisket on jasmine rice, pickled red cabbage, gochujang glaze, golden brown, gourmet plating, soft natural lighting, shallow depth of field, white ceramic bowl, dark wooden table background, appetizing, high detail, 4k
```

### Island Bowl (Asian-Hawaiian)
```
Professional food photography, Hawaiian teriyaki pork bowl, caramelized pineapple rings, coconut jasmine rice, sesame seeds, fresh green onion garnish, bright tropical lighting, white bowl, pastel blue background, appetizing, high detail, 4k
```

### Keto Bowl (Low-carb)
```
Professional food photography, keto cauliflower rice bowl with grilled chicken, avocado slices, cherry tomatoes, herb garnish, keto-friendly, healthy gourmet, bright natural lighting, ceramic bowl, clean white background, appetizing, high detail, 4k
```

### Vegan Garden Bowl
```
Professional food photography, vegan Buddha bowl, roasted seasonal vegetables, quinoa, chickpeas, tahini drizzle, fresh herbs, colorful, healthy gourmet, bright natural lighting, wooden bowl, rustic table background, appetizing, high detail, 4k
```

### Chef Portrait
```
Professional headshot photography, African American female chef in commercial kitchen, chef coat, warm smile, professional lighting, 4k, studio quality
```

## Required for Each Image

1. **Alt text** (accessibility):
   - "Delicious Soul Bowl with smoked brisket and pickled cabbage"
   - "Fresh Island Bowl with teriyaki pork and pineapple"
   - etc.

2. **Lazy loading** (performance):
   - Use Next.js Image with loading="lazy"
   - Provide width/height or use fill

3. **Responsive images**:
   - Multiple sizes for mobile/desktop

---

*Location in revvel-standards: docs/Soul2Bowl/IMAGE_GENERATION.md*
*Updated: 2026-05-07*