# Gamma Community `.gdsp` Library

Community-curated DSP nodes for the [Gamma Node Editor](https://9livezzz-git.github.io/Gamma-Node/).

Each `.gdsp` file in `gdsp/` is a single C++ DSP class plus `// @gdsp-*` metadata comments. The editor fetches this directory live via the GitHub Contents API and shows the contents in the User DSP tab under "Community".

## Contributing

1. Author your `.gdsp` in the editor (User DSP tab).
2. Click **Submit to community** in the editor — it opens a GitHub PR creation page with your source pre-filled.
3. The validation workflow runs on every PR. Green check = ready to merge.

You can also submit by opening a PR manually with a new file in `gdsp/`.

## What gets validated

Every PR triggers a GitHub Action that runs:

1. **Parse check** — every `.gdsp` file's `// @gdsp-*` directives are parsed exactly as the editor does. Malformed directives (missing `@gdsp-name`, bad input/output type, etc.) fail the build.
2. **Lint** — naming conventions, color hex format, description present, no obvious copy-paste mistakes.
3. **(Coming)** Emscripten compile check against actual Gamma headers. Currently the C++ inside the class is trusted; future iterations will compile a stub `int main() { MyClass c; c(0.f); return 0; }` to catch missing `#include`s and bad C++.

A red check blocks merging. Fix the listed issues and push again.

## File format

```cpp
// @gdsp-name        BitCrush
// @gdsp-category    UserDSP
// @gdsp-description Sample-rate and bit-depth reducer
// @gdsp-color       #c8e85a
// @gdsp-input       in    audio
// @gdsp-input       bits  param  8
// @gdsp-input       rate  param  0.5
// @gdsp-output      out   audio
// @gdsp-method      bits  setBits

class BitCrush {
    float phase = 0.f;
    float held  = 0.f;
    float rate_ = 0.5f;
    int   bits_ = 8;
public:
    void rate(float v)    { rate_ = v; }
    void setBits(float v) { bits_ = (int)v; }

    float operator()(float in) {
        phase += rate_;
        if (phase >= 1.f) {
            phase -= 1.f;
            float step = float(1 << bits_);
            held = floorf(in * step) / step;
        }
        return held;
    }
};
```

Required directives: `@gdsp-name`, at least one `@gdsp-input`, at least one `@gdsp-output`. Everything else optional. Full reference in the editor's settings → AI panel format help.

## License

Each contribution is licensed under MIT (or the contributor's choice declared in a top-of-file comment). By opening a PR you confirm you have the right to share the code.
