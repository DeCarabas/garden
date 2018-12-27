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

    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                new GardenGame().Run();
            }
            catch (Exception e)
            {
                Console.WriteLine("SAD: {0}", e);
            }
        }
    }
}
