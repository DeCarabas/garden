
using System;
using Microsoft.Xna.Framework;

namespace Garden
{
    struct HSBColor
    {
        public float H;
        public float S;
        public float B;
        public float A;

        public HSBColor(float h, float s, float b) : this(h, s, b, 1)
        { }

        public HSBColor(float h, float s, float b, float a)
        {
            H = h;
            S = s;
            B = b;
            A = a;
        }

        public static HSBColor idColor(float id)
        {
            return new HSBColor((id * 0.31299f + 0.42f) % 1.0f, 1, 1);
        }

        public HSBColor Alter(float? shade = null, float? fade = null)
        {
            var h = this.H;
            var s = this.S;
            var b = this.B;
            var a = this.A;

            if (shade != null)
            {
                if (shade > 0)
                {
                    s = MathHelper.Clamp(s - shade.Value * (s), 0, 1);
                    b = MathHelper.Clamp(b + shade.Value * (1 - b), 0, 1);
                }
                else
                {
                    s = MathHelper.Clamp(s - shade.Value * (1 - s), 0, 1);
                    b = MathHelper.Clamp(b + shade.Value * (b), 0, 1);
                }

                h = (h + -0.06f * shade.Value + 1) % 1.0f;
            }

            if (fade != null)
            {
                if (fade < 0)
                {
                    a = MathHelper.Clamp(a * (1 + fade.Value), 0, 1);
                }
                else
                {
                    a = MathHelper.Clamp((1 - a) * fade.Value + a, 0, 1);
                }
            }

            return new HSBColor(h, s, b, a);
        }


        public Vector4 toRGBA()
        {
            return toRGBA(H, S, B, A);
        }

        public Color toColor()
        {
            return new Color(toRGBA());
        }

        public static Vector4 toRGBA(float h, float s, float v, float a)
        {
            float r, g, b;
            h *= 6;
            h = h % 6;

            var i = (float)Math.Floor(h);
            var f = h - i;
            var p = v * (1 - s);
            var q = v * (1 - (s * f));
            var t = v * (1 - (s * (1 - f)));

            if (i == 0)
            {
                r = v;
                g = t;
                b = p;
            }
            else if (i == 1)
            {
                r = q;
                g = v;
                b = p;
            }
            else if (i == 2)
            {
                r = p;
                g = v;
                b = t;
            }
            else if (i == 3)
            {
                r = p;
                g = q;
                b = v;
            }
            else if (i == 4)
            {
                r = t;
                g = p;
                b = v;
            }
            else
            {
                // i == 5.
                r = v;
                g = p;
                b = q;
            }

            return new Vector4(r, g, v, a);
        }
    }
}