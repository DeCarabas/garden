using System;
using Microsoft.Xna.Framework;

namespace Garden
{
    static class HSBColors
    {
        public static readonly HSBColor Brown = Def(0, 75, 65);
        public static readonly HSBColor RebeccaPurple = Def(270, 67, 60);

        public static HSBColor Def(float angle, float sat, float val)
        {
            return new HSBColor(angle / 360.0f, sat / 100.0f, val / 100.0f);
        }
    }
}
