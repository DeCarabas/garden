using System;
using Microsoft.Xna.Framework;

namespace Garden
{
    class GardenGame : Game
    {
        GraphicsDeviceManager graphics;

        public GardenGame()
        {
            graphics = new GraphicsDeviceManager(this);
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);
        }
    }
}
