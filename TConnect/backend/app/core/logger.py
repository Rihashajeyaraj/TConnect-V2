import logging
import sys

logger = logging.getLogger("TwiteConnect Backend")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter("[% (asctime)s] [% (levelname)s] [% (name)s:% (line)d] - % (message)s".replace(" ", ""))
handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s"))
logger.addHandler(handler)
