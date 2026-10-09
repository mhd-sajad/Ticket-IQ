"""
TicketIQ Backend Application Package
"""
import sys
import app.nlp as _nlp
import app.nlp.preprocess as _preprocess

# Backward compatibility alias for unpickling models saved with 'nlp.preprocess'
sys.modules.setdefault("nlp", _nlp)
sys.modules.setdefault("nlp.preprocess", _preprocess)
