using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

namespace Garden
{
    class GardenGame : Game
    {
        GraphicsDeviceManager graphics;
        SpriteFont font;

        public GardenGame()
        {
            graphics = new GraphicsDeviceManager(this);
            Content.RootDirectory = "content";
        }

        protected override void LoadContent()
        {
            font = Content.Load<SpriteFont>("fonts/basic");
        }

        protected override void UnloadContent()
        {
            font = null;
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            var spriteBatch = new SpriteBatch(GraphicsDevice);
            spriteBatch.Begin();
            spriteBatch.DrawString(font, "Score", new Vector2(100, 100), Color.Black);
            spriteBatch.End();
        }
    }
}
