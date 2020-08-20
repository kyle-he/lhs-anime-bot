import asyncio
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

import discord
import pytz
from discord.ext import commands, tasks

tz = pytz.timezone("America/Los_Angeles")


@dataclass
class Period:
    name: str
    start: time
    end: time
    notify: bool = True

    def __post_init__(self):
        self.start = self.start
        self.end = self.end

    @property
    def duration(self):
        return self.end - self.start


MONTHU = [
    Period("Period 1", time(8), time(9, 30)),
    Period("Period 2", time(9, 45), time(11, 15)),
    Period("Lunch", time(11, 15), time(12, 15), notify=False),
    Period("Period 3", time(12, 15), time(13, 45)),
    Period("Period 7", time(14), time(15, 30)),
]

TUEFRI = [
    Period("Period 4", time(9), time(10, 30)),
    Period("Period 5", time(10, 45), time(12, 15)),
    Period("Lunch", time(12, 15), time(13, 15), notify=False),
    Period("Office Hours", time(13, 15), time(14), notify=False),
    Period("Period 6", time(14), time(15, 30)),
]

CHANNEL_ID = 745692415683330158

SCHEDULE = [
    MONTHU,
    TUEFRI,
    [Period("Homeroom", time(9), time(10))],
    MONTHU,
    TUEFRI,
    [],
    [],
]

TEST = [
    Period("Test Class 1", time(0, 46), time(0, 47)),
    Period("Test Class 2", time(0, 47), time(0, 48)),
    Period("Test Class 3", time(0, 48), time(0, 49)),
]

SCHEDULE = [TEST, TEST, TEST, TEST, TEST]


class Bell(commands.Cog):
    """Bell schedule reminders."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bell.start()

    @property
    def db(self):
        return self.bot.get_cog("Database")

    def get_task(self, period: Period):
        async def task(bot: commands.Bot):
            start = tz.localize(datetime.combine(datetime.now(), period.start))
            await discord.utils.sleep_until(start - timedelta(minutes=5))
            channel = bot.get_channel(CHANNEL_ID)
            # lol hardcoding go brr
            await channel.send(
                f"<@&745720820474576896> **{period.name}** starts in 5 minutes at **{period.start:%-I:%M}** and ends at **{period.end:%-I:%M}**."
            )

        return task(self.bot)

    @tasks.loop(hours=24)
    async def bell(self):
        await self.bot.wait_until_ready()
        for period in SCHEDULE[datetime.today().weekday()]:
            asyncio.create_task(self.get_task(period))